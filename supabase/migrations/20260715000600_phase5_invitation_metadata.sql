-- Phase 5 follow-up: invitation context used by the secure invite function.

begin;

alter table public.user_profiles
  add column if not exists invitation_message text not null default '';

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
  up.invitation_message,
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

commit;
