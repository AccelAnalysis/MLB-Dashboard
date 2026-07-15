-- MLB Dashboard Phase 5: authentication, invitations, user lifecycle, and role enforcement.

begin;

alter table public.user_profiles
  add column if not exists invited_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists deactivated_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists invited_by text references public.user_profiles(id) on update cascade on delete set null,
  add column if not exists invitation_message text not null default '';

update public.user_profiles
set activated_at = coalesce(activated_at, created_at),
    last_seen_at = coalesce(last_seen_at, last_login_at)
where status = 'active';

create index if not exists idx_user_profiles_status_role on public.user_profiles(status, role);
create index if not exists idx_user_profiles_auth_user_id on public.user_profiles(auth_user_id);
create index if not exists idx_user_profiles_invited_by on public.user_profiles(invited_by);

create or replace function public.current_app_profile_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select status
  from public.user_profiles
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_app_profile_id_any_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.user_profiles
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.get_my_access_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'id', up.id,
        'authUserId', up.auth_user_id,
        'displayName', up.display_name,
        'email', up.email,
        'role', up.role,
        'status', up.status,
        'teamMemberId', up.team_member_id,
        'regionAccess', up.region_access,
        'lastLoginAt', up.last_login_at,
        'lastSeenAt', up.last_seen_at,
        'invitedAt', up.invited_at,
        'activatedAt', up.activated_at,
        'permissions', jsonb_build_object(
          'manageUsers', up.role in ('owner', 'business_admin'),
          'manageBackend', up.role in ('owner', 'business_admin'),
          'manageBusiness', up.role in ('owner', 'business_admin', 'operations_admin'),
          'manageSales', up.role in ('owner', 'business_admin', 'operations_admin', 'sales_manager'),
          'manageProduction', up.role in ('owner', 'business_admin', 'operations_admin', 'production_manager'),
          'manageFinancials', up.role in ('owner', 'business_admin', 'operations_admin'),
          'importExport', up.role in ('owner', 'business_admin'),
          'resetData', up.role = 'owner',
          'operatorDashboard', up.role <> 'wallboard',
          'wallboard', true
        )
      )
      from public.user_profiles up
      where up.auth_user_id = auth.uid()
      limit 1
    ),
    '{}'::jsonb
  );
$$;

create or replace function public.activate_my_invitation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.user_profiles;
begin
  select * into profile
  from public.user_profiles
  where auth_user_id = auth.uid()
  for update;

  if profile.id is null then
    raise exception 'No MLB Dashboard profile is linked to this authentication account.';
  end if;

  if profile.status = 'inactive' then
    raise exception 'This MLB Dashboard account is inactive. Contact an administrator.';
  end if;

  if profile.status = 'invited' then
    update public.user_profiles
    set status = 'active',
        activated_at = coalesce(activated_at, now()),
        deactivated_at = null,
        last_login_at = now(),
        last_seen_at = now(),
        updated_at = now()
    where id = profile.id
    returning * into profile;

    insert into public.activity_logs (
      id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      occurred_at,
      reason,
      changed_fields,
      before,
      after,
      context,
      source_system,
      sync_state
    ) values (
      'ACT-AUTH-' || replace(gen_random_uuid()::text, '-', ''),
      profile.id,
      'user_invitation_activated',
      'user_profile',
      profile.id,
      now(),
      'Invited user completed account activation.',
      '["status","activatedAt","lastLoginAt"]'::jsonb,
      '{"status":"invited"}'::jsonb,
      jsonb_build_object('status', 'active'),
      jsonb_build_object('authUserId', auth.uid()),
      'dashboard',
      'synced'
    );
  else
    update public.user_profiles
    set last_login_at = now(),
        last_seen_at = now(),
        updated_at = now()
    where id = profile.id
    returning * into profile;
  end if;

  return public.get_my_access_context();
end;
$$;

create or replace function public.touch_my_session()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set last_login_at = coalesce(last_login_at, now()),
      last_seen_at = now(),
      updated_at = now()
  where auth_user_id = auth.uid()
    and status = 'active';
end;
$$;

create or replace function public.update_user_access(
  p_user_id text,
  p_role text,
  p_status text,
  p_region_access text[] default null,
  p_team_member_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id text := public.current_app_user_id();
  actor_role text := public.current_app_role();
  before_profile public.user_profiles;
  after_profile public.user_profiles;
  active_owner_count integer;
begin
  if not public.can_manage_users() then
    raise exception 'You do not have permission to manage users.';
  end if;

  if p_role not in ('owner', 'business_admin', 'operations_admin', 'sales_manager', 'salesperson', 'production_manager', 'viewer', 'wallboard', 'developer_support') then
    raise exception 'Invalid application role: %', p_role;
  end if;

  if p_status not in ('invited', 'active', 'inactive') then
    raise exception 'Invalid user status: %', p_status;
  end if;

  select * into before_profile
  from public.user_profiles
  where id = p_user_id
  for update;

  if before_profile.id is null then
    raise exception 'User profile % was not found.', p_user_id;
  end if;

  if (p_role = 'owner' or before_profile.role = 'owner') and actor_role <> 'owner' then
    raise exception 'Only an owner can assign, change, or deactivate an owner role.';
  end if;

  if before_profile.role = 'owner' and (p_role <> 'owner' or p_status <> 'active') then
    select count(*) into active_owner_count
    from public.user_profiles
    where role = 'owner'
      and status = 'active'
      and id <> before_profile.id;

    if active_owner_count = 0 then
      raise exception 'The last active owner cannot be demoted or deactivated.';
    end if;
  end if;

  update public.user_profiles
  set role = p_role,
      status = p_status,
      region_access = coalesce(p_region_access, region_access),
      team_member_id = p_team_member_id,
      activated_at = case
        when p_status = 'active' then coalesce(activated_at, now())
        else activated_at
      end,
      deactivated_at = case
        when p_status = 'inactive' then now()
        else null
      end,
      updated_by = actor_id,
      updated_at = now()
  where id = p_user_id
  returning * into after_profile;

  insert into public.activity_logs (
    id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    occurred_at,
    reason,
    changed_fields,
    before,
    after,
    context,
    source_system,
    sync_state
  ) values (
    'ACT-USER-' || replace(gen_random_uuid()::text, '-', ''),
    actor_id,
    'user_access_updated',
    'user_profile',
    p_user_id,
    now(),
    'Application role or account status updated.',
    '["role","status","regionAccess","teamMemberId"]'::jsonb,
    jsonb_build_object(
      'role', before_profile.role,
      'status', before_profile.status,
      'regionAccess', before_profile.region_access,
      'teamMemberId', before_profile.team_member_id
    ),
    jsonb_build_object(
      'role', after_profile.role,
      'status', after_profile.status,
      'regionAccess', after_profile.region_access,
      'teamMemberId', after_profile.team_member_id
    ),
    jsonb_build_object('actorRole', actor_role),
    'dashboard',
    'synced'
  );

  return jsonb_build_object(
    'id', after_profile.id,
    'displayName', after_profile.display_name,
    'email', after_profile.email,
    'role', after_profile.role,
    'status', after_profile.status,
    'teamMemberId', after_profile.team_member_id,
    'regionAccess', after_profile.region_access,
    'updatedAt', after_profile.updated_at
  );
end;
$$;

grant execute on function public.current_app_profile_status() to authenticated;
grant execute on function public.current_app_profile_id_any_status() to authenticated;
grant execute on function public.get_my_access_context() to authenticated;
grant execute on function public.activate_my_invitation() to authenticated;
grant execute on function public.touch_my_session() to authenticated;
grant execute on function public.update_user_access(text, text, text, text[], text) to authenticated;

drop policy if exists user_profiles_select_active on public.user_profiles;
create policy user_profiles_select_own_or_admin
on public.user_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.can_manage_users()
);

drop policy if exists user_profiles_insert_admin on public.user_profiles;
create policy user_profiles_insert_admin
on public.user_profiles
for insert
to authenticated
with check (public.can_manage_users());

drop policy if exists user_profiles_update_admin on public.user_profiles;
create policy user_profiles_update_admin
on public.user_profiles
for update
to authenticated
using (public.can_manage_users())
with check (public.can_manage_users());

insert into public.app_settings (key, value, description)
values (
  'authentication',
  '{"provider":"supabase","phase":5,"invitationOnly":true,"selfSignup":false}'::jsonb,
  'Authentication and user-lifecycle implementation metadata.'
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

commit;
