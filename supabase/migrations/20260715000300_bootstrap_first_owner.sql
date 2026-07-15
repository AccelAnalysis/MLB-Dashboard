-- Service-role-only helper for linking the first Supabase auth account to an
-- MLB Dashboard owner profile. This avoids temporarily weakening RLS.

create or replace function public.bootstrap_first_owner(
  p_profile_id text,
  p_auth_user_id uuid,
  p_display_name text,
  p_email text
)
returns public.user_profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result public.user_profiles;
begin
  if p_profile_id is null or length(trim(p_profile_id)) = 0 then
    raise exception 'Profile ID is required.';
  end if;

  if p_auth_user_id is null then
    raise exception 'Auth user ID is required.';
  end if;

  if not exists (select 1 from auth.users where id = p_auth_user_id) then
    raise exception 'Auth user % does not exist.', p_auth_user_id;
  end if;

  if exists (
    select 1
    from public.user_profiles
    where role = 'owner'
      and status = 'active'
      and auth_user_id <> p_auth_user_id
  ) then
    raise exception 'An active owner profile already exists. Use normal user administration instead.';
  end if;

  insert into public.user_profiles (
    id,
    auth_user_id,
    display_name,
    email,
    role,
    status,
    region_access,
    source_system,
    sync_state
  )
  values (
    p_profile_id,
    p_auth_user_id,
    trim(p_display_name),
    lower(trim(p_email)),
    'owner',
    'active',
    array['Virginia', 'Carolina'],
    'dashboard',
    'synced'
  )
  on conflict (id) do update
  set auth_user_id = excluded.auth_user_id,
      display_name = excluded.display_name,
      email = excluded.email,
      role = 'owner',
      status = 'active',
      region_access = excluded.region_access,
      updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.bootstrap_first_owner(text, uuid, text, text) from public;
revoke all on function public.bootstrap_first_owner(text, uuid, text, text) from anon;
revoke all on function public.bootstrap_first_owner(text, uuid, text, text) from authenticated;
grant execute on function public.bootstrap_first_owner(text, uuid, text, text) to service_role;

comment on function public.bootstrap_first_owner(text, uuid, text, text) is
  'Links the first Supabase auth account to an active MLB Dashboard owner profile. Service role only.';
