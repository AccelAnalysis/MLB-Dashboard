-- Phase 5 follow-up: use explicit trigger returns for service-role operations.
-- PostgreSQL trigger functions return OLD for DELETE and NEW for INSERT/UPDATE.

begin;

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
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
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

    if new.role = 'owner'
      and old.role is distinct from 'owner'
      and coalesce(actor_app_role, '') <> 'owner' then
      raise exception 'Only an owner can assign the owner role.' using errcode = '42501';
    end if;

    if new.auth_user_id is distinct from old.auth_user_id
      and coalesce(actor_app_role, '') <> 'owner' then
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

commit;
