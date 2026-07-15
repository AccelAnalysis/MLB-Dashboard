-- Phase 5 hardening: application user-profile writes must flow through protected
-- RPCs or the service-role invitation function. Direct browser INSERT/UPDATE is
-- denied so owner protections cannot be bypassed through the REST table API.

begin;

drop policy if exists user_profiles_insert_admin on public.user_profiles;
drop policy if exists user_profiles_update_admin on public.user_profiles;
drop policy if exists user_profiles_insert_managers on public.user_profiles;
drop policy if exists user_profiles_update_managers on public.user_profiles;

revoke insert, update, delete on public.user_profiles from authenticated;
grant select on public.user_profiles to authenticated;

comment on table public.user_profiles is
  'Application identity and role profiles. Browser writes are RPC-only; invitation creation uses the service role.';

commit;
