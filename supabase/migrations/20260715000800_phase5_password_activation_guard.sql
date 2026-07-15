-- Phase 5 hardening: an invited profile cannot become active until the linked
-- Supabase Auth account has a password credential.

begin;

create or replace function public.activate_my_invitation()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile public.user_profiles;
  password_is_set boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

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
    select coalesce(length(encrypted_password), 0) > 0
    into password_is_set
    from auth.users
    where id = auth.uid();

    if not coalesce(password_is_set, false) then
      raise exception 'Create a password before activating the MLB Dashboard invitation.';
    end if;

    update public.user_profiles
    set status = 'active',
        activated_at = coalesce(activated_at, now()),
        deactivated_at = null,
        last_login_at = now(),
        last_seen_at = now(),
        updated_at = now(),
        updated_by = profile.id
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
      'Invited user created a password and completed account activation.',
      '["status","activatedAt","lastLoginAt"]'::jsonb,
      '{"status":"invited"}'::jsonb,
      jsonb_build_object('status', 'active'),
      jsonb_build_object('authUserId', auth.uid(), 'passwordCredentialVerified', true),
      'dashboard',
      'synced'
    );
  else
    update public.user_profiles
    set last_login_at = now(),
        last_seen_at = now(),
        updated_at = now(),
        updated_by = profile.id
    where id = profile.id
    returning * into profile;
  end if;

  return public.get_my_access_context();
end;
$$;

grant execute on function public.activate_my_invitation() to authenticated;

commit;
