-- Clarify actor attribution in the Phase 5 self-service profile function.

begin;

create or replace function public.update_my_profile(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.user_profiles;
  actor_id text := public.current_app_user_id();
  cleaned_name text := trim(coalesce(p_display_name, ''));
begin
  if actor_id is null then
    raise exception 'An active MLB Dashboard profile is required.';
  end if;

  if length(cleaned_name) < 2 then
    raise exception 'Display name must contain at least two characters.';
  end if;

  update public.user_profiles
  set display_name = cleaned_name,
      updated_at = now(),
      updated_by = actor_id
  where id = actor_id
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
    actor_id,
    'profile_display_name_updated',
    'user_profile',
    actor_id,
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

commit;
