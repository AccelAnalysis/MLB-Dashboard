-- Phase 5 self-service profile updates and supporting comments.

begin;

create or replace function public.update_my_profile(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.user_profiles;
  cleaned_name text := trim(coalesce(p_display_name, ''));
begin
  if length(cleaned_name) < 2 then
    raise exception 'Display name must contain at least two characters.';
  end if;

  update public.user_profiles
  set display_name = cleaned_name,
      updated_at = now(),
      updated_by = id
  where auth_user_id = auth.uid()
    and status = 'active'
  returning * into profile;

  if profile.id is null then
    raise exception 'An active MLB Dashboard profile is required.';
  end if;

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
    'ACT-PROFILE-' || replace(gen_random_uuid()::text, '-', ''),
    profile.id,
    'profile_display_name_updated',
    'user_profile',
    profile.id,
    now(),
    'User updated their display name.',
    '["displayName"]'::jsonb,
    null,
    jsonb_build_object('displayName', profile.display_name),
    '{}'::jsonb,
    'dashboard',
    'synced'
  );

  return public.get_my_access_context();
end;
$$;

grant execute on function public.update_my_profile(text) to authenticated;

comment on function public.get_my_access_context() is
  'Returns the authenticated user profile and Phase 5 permission summary, including invited or inactive profiles.';
comment on function public.activate_my_invitation() is
  'Activates an invited profile after the authenticated user sets a password; inactive profiles remain blocked.';
comment on function public.update_user_access(text, text, text, text[], text) is
  'Owner/business-admin user lifecycle operation with last-owner protection and activity history.';

commit;
