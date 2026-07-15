-- Phase 5 follow-up: individual salespeople see only jobs assigned to their
-- linked team-member identity. Other roles continue to use region access.

begin;

create or replace function public.can_access_job(
  target_region text,
  assigned_salesperson_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_active_app_user() then false
    when public.current_app_role() = 'salesperson' then
      public.current_app_team_member_id() is not null
      and assigned_salesperson_id = public.current_app_team_member_id()
    else public.can_access_region(target_region)
  end;
$$;

grant execute on function public.can_access_job(text, text) to authenticated;

drop policy if exists jobs_select_authorized_region on public.jobs;
create policy jobs_select_authorized_scope
on public.jobs
for select
to authenticated
using (
  public.can_access_job(region, salesperson_id)
);

drop policy if exists work_scopes_select_authorized_region on public.work_scopes;
create policy work_scopes_select_authorized_scope
on public.work_scopes
for select
to authenticated
using (
  exists (
    select 1
    from public.jobs j
    where j.id = work_scopes.job_id
      and public.can_access_job(j.region, j.salesperson_id)
  )
);

drop policy if exists change_orders_select_authorized_region on public.change_orders;
create policy change_orders_select_authorized_scope
on public.change_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.jobs j
    where j.id = change_orders.job_id
      and public.can_access_job(j.region, j.salesperson_id)
  )
);

drop policy if exists leads_select_authorized on public.leads;
create policy leads_select_authorized_scope
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
        and public.can_access_job(j.region, j.salesperson_id)
    )
  )
);

drop policy if exists customers_select_authorized on public.customers;
create policy customers_select_authorized_scope
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
        and public.can_access_job(j.region, j.salesperson_id)
    )
    or exists (
      select 1
      from public.leads l
      where l.customer_id = customers.id
        and l.assigned_salesperson_id = public.current_app_team_member_id()
    )
  )
);

commit;
