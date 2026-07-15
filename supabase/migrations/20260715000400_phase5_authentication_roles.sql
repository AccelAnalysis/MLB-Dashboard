-- MLB Dashboard Phase 5: authentication, user lifecycle, role enforcement,
-- invitation acceptance, regional visibility, and protected owner management.

begin;

alter table public.user_profiles
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by text references public.user_profiles(id) on update cascade on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists password_updated_at timestamptz,
  add column if not exists disabled_reason text not null default '';

update public.user_profiles
set invited_at = coalesce(invited_at, created_at)
where status = 'invited';

create index if not exists idx_user_profiles_status_role
  on public.user_profiles(status, role);

create index if not exists idx_user_profiles_invited_by
  on public.user_profiles(invited_by);

create or replace function public.current_app_team_member_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select team_member_id
  from public.user_profiles
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.current_app_region_access()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(region_access, '{}'::text[])
  from public.user_profiles
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.can_manage_business_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'business_admin', 'operations_admin'), false);
$$;

create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'business_admin'), false);
$$;

create or replace function public.can_manage_sales_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'business_admin', 'operations_admin', 'sales_manager'), false);
$$;

create or replace function public.can_manage_production_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'business_admin', 'operations_admin', 'production_manager'), false);
$$;

create or replace function public.can_use_legacy_full_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'business_admin', 'operations_admin'), false);
$$;

create or replace function public.can_access_region(target_region text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_active_app_user() then false
    when public.current_app_role() in ('owner', 'business_admin', 'operations_admin', 'developer_support') then true
    when coalesce(trim(target_region), '') = '' then true
    else target_region = any(public.current_app_region_access())
  end;
$$;

grant execute on function public.current_app_team_member_id() to authenticated;
grant execute on function public.current_app_region_access() to authenticated;
grant execute on function public.can_use_legacy_full_write() to authenticated;
grant execute on function public.can_access_region(text) to authenticated;

create or replace function public.get_current_user_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
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
      'invitedAt', up.invited_at,
      'acceptedAt', up.accepted_at,
      'passwordUpdatedAt', up.password_updated_at,
      'disabledReason', up.disabled_reason,
      'capabilities', jsonb_build_object(
        'manageUsers', up.status = 'active' and up.role in ('owner', 'business_admin'),
        'manageBusinessData', up.status = 'active' and up.role in ('owner', 'business_admin', 'operations_admin'),
        'manageSalesData', up.status = 'active' and up.role in ('owner', 'business_admin', 'operations_admin', 'sales_manager'),
        'manageProductionData', up.status = 'active' and up.role in ('owner', 'business_admin', 'operations_admin', 'production_manager'),
        'legacyFullWrite', up.status = 'active' and up.role in ('owner', 'business_admin', 'operations_admin'),
        'backendAdministration', up.status = 'active' and up.role in ('owner', 'business_admin', 'operations_admin', 'developer_support'),
        'wallboardOnly', up.status = 'active' and up.role = 'wallboard',
        'readOnly', up.status <> 'active' or up.role in ('salesperson', 'viewer', 'wallboard', 'developer_support')
      )
    )
    from public.user_profiles up
    where up.auth_user_id = auth.uid()
    limit 1
  ), '{}'::jsonb);
$$;

create or replace function public.record_app_login()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile public.user_profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  select * into profile
  from public.user_profiles
  where auth_user_id = auth.uid()
  limit 1;

  if profile.id is null then
    raise exception 'No MLB Dashboard user profile is linked to this authentication account.' using errcode = 'P0001';
  end if;

  if profile.status = 'inactive' then
    raise exception 'This MLB Dashboard account is inactive.' using errcode = 'P0001';
  end if;

  update public.user_profiles
  set status = case when status = 'invited' then 'active' else status end,
      accepted_at = case when status = 'invited' then coalesce(accepted_at, now()) else accepted_at end,
      last_login_at = now(),
      disabled_reason = case when status = 'invited' then '' else disabled_reason end
  where id = profile.id;

  return public.get_current_user_context();
end;
$$;

create or replace function public.record_password_update()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  update public.user_profiles
  set password_updated_at = changed_at
  where auth_user_id = auth.uid();

  return changed_at;
end;
$$;

create or replace function public.update_my_profile(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if length(trim(coalesce(p_display_name, ''))) < 2 then
    raise exception 'Display name must contain at least two characters.' using errcode = '22023';
  end if;

  update public.user_profiles
  set display_name = trim(p_display_name)
  where auth_user_id = auth.uid()
    and status = 'active';

  return public.get_current_user_context();
end;
$$;

grant execute on function public.get_current_user_context() to authenticated;
grant execute on function public.record_app_login() to authenticated;
grant execute on function public.record_password_update() to authenticated;
grant execute on function public.update_my_profile(text) to authenticated;

create or replace function public.protect_user_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_app_role text := public.current_app_role();
  actor_auth_role text := auth.role();
  same_user_safe_update boolean := false;
begin
  if actor_auth_role = 'service_role' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' then
    same_user_safe_update := old.auth_user_id = auth.uid()
      and new.auth_user_id is not distinct from old.auth_user_id
      and new.role is not distinct from old.role
      and new.team_member_id is not distinct from old.team_member_id
      and new.email is not distinct from old.email
      and (
        new.status is not distinct from old.status
        or (old.status = 'invited' and new.status = 'active')
      );

    if same_user_safe_update then
      return new;
    end if;

    if old.role = 'owner' and coalesce(actor_app_role, '') <> 'owner' then
      raise exception 'Only an owner can modify an owner profile.' using errcode = '42501';
    end if;

    if new.role = 'owner' and old.role is distinct from 'owner' and coalesce(actor_app_role, '') <> 'owner' then
      raise exception 'Only an owner can assign the owner role.' using errcode = '42501';
    end if;

    if new.auth_user_id is distinct from old.auth_user_id and coalesce(actor_app_role, '') <> 'owner' then
      raise exception 'Only an owner can relink an authentication account.' using errcode = '42501';
    end if;

    if old.role = 'owner'
      and old.status = 'active'
      and (new.role <> 'owner' or new.status <> 'active')
      and not exists (
        select 1
        from public.user_profiles other
        where other.id <> old.id
          and other.role = 'owner'
          and other.status = 'active'
      ) then
      raise exception 'The final active owner cannot be demoted or deactivated.' using errcode = '23514';
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'owner' and coalesce(actor_app_role, '') <> 'owner' then
      raise exception 'Only an owner can remove an owner profile.' using errcode = '42501';
    end if;

    if old.role = 'owner'
      and old.status = 'active'
      and not exists (
        select 1
        from public.user_profiles other
        where other.id <> old.id
          and other.role = 'owner'
          and other.status = 'active'
      ) then
      raise exception 'The final active owner cannot be deleted.' using errcode = '23514';
    end if;

    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_user_profile_privileges_trigger on public.user_profiles;
create trigger protect_user_profile_privileges_trigger
before update or delete on public.user_profiles
for each row execute function public.protect_user_profile_privileges();

-- Restrict profile visibility to self or user administrators.
drop policy if exists user_profiles_select_active on public.user_profiles;
create policy user_profiles_select_self_or_admin
on public.user_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.can_manage_users()
);

-- Apply region-aware visibility to operational records.
drop policy if exists jobs_select_active on public.jobs;
create policy jobs_select_authorized_region
on public.jobs
for select
to authenticated
using (
  public.is_active_app_user()
  and public.can_access_region(region)
);

drop policy if exists work_scopes_select_active on public.work_scopes;
create policy work_scopes_select_authorized_region
on public.work_scopes
for select
to authenticated
using (
  public.is_active_app_user()
  and exists (
    select 1
    from public.jobs j
    where j.id = work_scopes.job_id
      and public.can_access_region(j.region)
  )
);

drop policy if exists change_orders_select_active on public.change_orders;
create policy change_orders_select_authorized_region
on public.change_orders
for select
to authenticated
using (
  public.is_active_app_user()
  and exists (
    select 1
    from public.jobs j
    where j.id = change_orders.job_id
      and public.can_access_region(j.region)
  )
);

drop policy if exists leads_select_active on public.leads;
create policy leads_select_authorized
on public.leads
for select
to authenticated
using (
  public.is_active_app_user()
  and (
    public.can_manage_sales_data()
    or assigned_salesperson_id = public.current_app_team_member_id()
    or exists (
      select 1
      from public.jobs j
      where j.lead_id = leads.id
        and public.can_access_region(j.region)
    )
  )
);

drop policy if exists customers_select_active on public.customers;
create policy customers_select_authorized
on public.customers
for select
to authenticated
using (
  public.is_active_app_user()
  and (
    public.can_manage_business_data()
    or public.can_manage_sales_data()
    or public.can_manage_production_data()
    or exists (
      select 1
      from public.jobs j
      where j.customer_id = customers.id
        and public.can_access_region(j.region)
    )
    or exists (
      select 1
      from public.leads l
      where l.customer_id = customers.id
        and l.assigned_salesperson_id = public.current_app_team_member_id()
    )
  )
);

create or replace view public.v_user_administration
with (security_invoker = true)
as
select
  up.id,
  up.auth_user_id,
  up.display_name,
  up.email,
  up.role,
  up.status,
  up.team_member_id,
  tm.display_name as team_member_name,
  up.region_access,
  up.invited_at,
  inviter.display_name as invited_by_name,
  up.accepted_at,
  up.last_login_at,
  up.password_updated_at,
  up.disabled_reason,
  up.created_at,
  up.updated_at
from public.user_profiles up
left join public.team_members tm on tm.id = up.team_member_id
left join public.user_profiles inviter on inviter.id = up.invited_by;

grant select on public.v_user_administration to authenticated;

insert into public.app_settings (key, value, description)
values (
  'authentication',
  '{"provider":"supabase","phase":5,"signup":"invite_only","profileRequired":true}'::jsonb,
  'Authentication and user-profile enforcement metadata.'
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

commit;
