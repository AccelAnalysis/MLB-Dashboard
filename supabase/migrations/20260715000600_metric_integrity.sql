-- MLB Dashboard metric-integrity corrections
-- Adds real sales-activity input and scope-level revenue allocation.

begin;

create table if not exists public.sales_activity (
  id text primary key,
  activity_date date not null,
  salesperson text not null check (length(trim(salesperson)) > 0),
  region text not null default '',
  lead_source text not null default '',
  category text not null default 'All',
  leads integer not null default 0 check (leads >= 0),
  opportunities integer not null default 0 check (opportunities >= 0),
  created_at timestamptz not null default now(),
  created_by text references public.user_profiles(id) on update cascade on delete set null,
  updated_at timestamptz not null default now(),
  updated_by text references public.user_profiles(id) on update cascade on delete set null,
  revision integer not null default 1 check (revision > 0)
);

alter table public.work_scopes
  add column if not exists allocated_amount numeric(14,2) not null default 0 check (allocated_amount >= 0);

create trigger sales_activity_updated_metadata
before update on public.sales_activity
for each row execute function public.set_record_updated_metadata();

create index if not exists sales_activity_date_idx on public.sales_activity (activity_date desc);
create index if not exists sales_activity_salesperson_idx on public.sales_activity (lower(salesperson), activity_date desc);
create index if not exists sales_activity_category_idx on public.sales_activity (category, activity_date desc);

alter table public.sales_activity enable row level security;

create policy sales_activity_select_active
on public.sales_activity for select to authenticated
using (public.is_active_app_user());

create policy sales_activity_insert_sales
on public.sales_activity for insert to authenticated
with check (public.can_manage_sales_data());

create policy sales_activity_update_sales
on public.sales_activity for update to authenticated
using (public.can_manage_sales_data())
with check (public.can_manage_sales_data());

create policy sales_activity_delete_sales
on public.sales_activity for delete to authenticated
using (public.can_manage_sales_data());

grant select, insert, update, delete on public.sales_activity to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.sales_activity;
exception when duplicate_object then null;
end $$;

insert into public.app_settings (key, value, description)
values (
  'metric_integrity',
  '{"salesActivity":"shared","collectionDate":"required_for_cycle_time","categoryRevenue":"scope_allocation_required_for_multi_scope"}'::jsonb,
  'Metric integrity rules for sales, collection timing, and category revenue.'
)
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

commit;
