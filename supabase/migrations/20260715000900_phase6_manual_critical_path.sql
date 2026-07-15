-- MLB Dashboard Phase 6: production manual entry and Critical Path replacement safeguards.

begin;

alter table public.jobs
  drop constraint if exists jobs_manual_amounts_nonnegative;
alter table public.jobs
  add constraint jobs_manual_amounts_nonnegative
  check (
    original_contract_amount >= 0
    and final_amount >= 0
    and deposit_amount >= 0
    and amount_paid >= 0
    and balance_due >= 0
  ) not valid;

alter table public.jobs
  drop constraint if exists jobs_cancelled_requires_details;
alter table public.jobs
  add constraint jobs_cancelled_requires_details
  check (
    production_stage <> 'cancelled'
    or (
      cancelled_at is not null
      and length(trim(coalesce(cancellation_reason, ''))) > 0
    )
  ) not valid;

alter table public.work_scopes
  drop constraint if exists work_scopes_active_category_required;
alter table public.work_scopes
  add constraint work_scopes_active_category_required
  check (
    record_status = 'archived'
    or length(trim(coalesce(category, ''))) > 0
  ) not valid;

create or replace view public.v_manual_entry_readiness
with (security_invoker = true)
as
select
  j.id as job_id,
  j.customer_id,
  c.display_name as customer_name,
  'job_without_scope'::text as issue_type,
  'warning'::text as severity,
  'Sold job has no active work scope.'::text as detail
from public.jobs j
join public.customers c on c.id = j.customer_id
left join public.work_scopes ws
  on ws.job_id = j.id
  and ws.record_status <> 'archived'
where j.record_status <> 'archived'
group by j.id, j.customer_id, c.display_name
having count(ws.id) = 0

union all

select
  j.id,
  j.customer_id,
  c.display_name,
  'missing_salesperson',
  'warning',
  'Job has no assigned salesperson; scorecards will show it as unassigned.'
from public.jobs j
join public.customers c on c.id = j.customer_id
where j.record_status <> 'archived'
  and j.salesperson_id is null

union all

select
  j.id,
  j.customer_id,
  c.display_name,
  'missing_lead_source',
  'warning',
  'Job lead is missing a source; lead-source reporting will be incomplete.'
from public.jobs j
join public.customers c on c.id = j.customer_id
left join public.leads l on l.id = j.lead_id
where j.record_status <> 'archived'
  and length(trim(coalesce(l.source, ''))) = 0

union all

select
  j.id,
  j.customer_id,
  c.display_name,
  'customer_without_contact',
  'warning',
  'Customer has neither a phone number nor an email address.'
from public.jobs j
join public.customers c on c.id = j.customer_id
where j.record_status <> 'archived'
  and length(trim(coalesce(c.phone, ''))) = 0
  and length(trim(coalesce(c.email, ''))) = 0

union all

select
  j.id,
  j.customer_id,
  c.display_name,
  'cancelled_without_complete_details',
  'error',
  'Cancelled job requires a cancellation date and reason.'
from public.jobs j
join public.customers c on c.id = j.customer_id
where j.record_status <> 'archived'
  and j.production_stage = 'cancelled'
  and (
    j.cancelled_at is null
    or length(trim(coalesce(j.cancellation_reason, ''))) = 0
  )

union all

select
  j.id,
  j.customer_id,
  c.display_name,
  'scope_date_sequence',
  'error',
  'A work-scope completion date precedes its measure-request date.'
from public.jobs j
join public.customers c on c.id = j.customer_id
join public.work_scopes ws on ws.job_id = j.id
where j.record_status <> 'archived'
  and ws.record_status <> 'archived'
  and nullif(left(coalesce(ws.dates ->> 'measureRequested', ''), 10), '') is not null
  and nullif(left(coalesce(ws.dates ->> 'completed', ''), 10), '') is not null
  and left(ws.dates ->> 'completed', 10) < left(ws.dates ->> 'measureRequested', 10);

grant select on public.v_manual_entry_readiness to authenticated;

create or replace function public.get_manual_entry_status()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'phase', 6,
    'serverTime', now(),
    'jobCount', (select count(*) from public.jobs where record_status <> 'archived'),
    'activeScopeCount', (select count(*) from public.work_scopes where record_status <> 'archived'),
    'readinessIssueCount', (select count(*) from public.v_manual_entry_readiness),
    'errorCount', (select count(*) from public.v_manual_entry_readiness where severity = 'error'),
    'warningCount', (select count(*) from public.v_manual_entry_readiness where severity = 'warning')
  );
$$;

grant execute on function public.get_manual_entry_status() to authenticated;

insert into public.app_settings (key, value, description)
values (
  'manual_critical_path',
  '{"phase":6,"manualFirst":true,"normalizedEntry":true,"legacyProjection":true,"requiresAtLeastOneScope":true,"archiveInsteadOfDelete":true}'::jsonb,
  'Phase 6 manual entry and Critical Path replacement implementation metadata.'
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

commit;
