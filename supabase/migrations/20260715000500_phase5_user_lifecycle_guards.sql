-- Phase 5 follow-up: require an operational reason for inactive accounts.

begin;

update public.user_profiles
set disabled_reason = 'Deactivated before Phase 5 reason enforcement.'
where status = 'inactive'
  and length(trim(coalesce(disabled_reason, ''))) = 0;

alter table public.user_profiles
  drop constraint if exists user_profiles_inactive_reason_required;

alter table public.user_profiles
  add constraint user_profiles_inactive_reason_required
  check (
    status <> 'inactive'
    or length(trim(disabled_reason)) > 0
  );

commit;
