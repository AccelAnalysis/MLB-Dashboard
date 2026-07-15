-- Phase 5 follow-up: first-time invited users must complete password setup
-- before the application treats the session as fully ready.

begin;

create or replace function public.record_app_login()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile public.user_profiles;
  was_invited boolean := false;
  context jsonb;
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

  was_invited := profile.status = 'invited';

  update public.user_profiles
  set status = case when status = 'invited' then 'active' else status end,
      accepted_at = case when status = 'invited' then coalesce(accepted_at, now()) else accepted_at end,
      last_login_at = now(),
      disabled_reason = case when status = 'invited' then '' else disabled_reason end
  where id = profile.id;

  context := public.get_current_user_context();
  return context || jsonb_build_object('requiresPasswordSetup', was_invited);
end;
$$;

grant execute on function public.record_app_login() to authenticated;

commit;
