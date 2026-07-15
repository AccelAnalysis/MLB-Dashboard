-- MLB Dashboard Phase 4: shared production backend
-- Target: Supabase/Postgres
-- Production domain model: mlb-dashboard-production-model 3.0.0

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helper functions
-- ---------------------------------------------------------------------------

create or replace function public.set_record_updated_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.revision := greatest(coalesce(old.revision, 0) + 1, 1);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core production tables
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  display_name text not null check (length(trim(display_name)) > 0),
  first_name text not null default '',
  last_name text not null default '',
  company_name text not null default '',
  phone text not null default '',
  alternate_phone text not null default '',
  email text not null default '',
  address jsonb not null default '{"line1":"","line2":"","city":"","county":"","state":"","postalCode":""}'::jsonb,
  preferred_contact_method text not null default '',
  notes text not null default '',
  tags text[] not null default '{}'::text[]
);

create table if not exists public.team_members (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  display_name text not null check (length(trim(display_name)) > 0),
  employee_type text not null default '',
  department text not null default '',
  salesperson boolean not null default false,
  production_staff boolean not null default false,
  active boolean not null default true,
  phone text not null default '',
  email text not null default '',
  region_assignments text[] not null default '{}'::text[]
);

create table if not exists public.crews (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  name text not null check (length(trim(name)) > 0),
  crew_type text not null default '',
  trade_categories text[] not null default '{}'::text[],
  lead_team_member_id text references public.team_members(id) on update cascade on delete set null,
  active boolean not null default true,
  notes text not null default ''
);

create table if not exists public.user_profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on update cascade on delete set null,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  display_name text not null check (length(trim(display_name)) > 0),
  email text not null check (length(trim(email)) > 0),
  role text not null check (role in ('owner', 'business_admin', 'operations_admin', 'sales_manager', 'salesperson', 'production_manager', 'viewer', 'wallboard', 'developer_support')),
  status text not null default 'invited' check (status in ('invited', 'active', 'inactive')),
  team_member_id text references public.team_members(id) on update cascade on delete set null,
  region_access text[] not null default '{}'::text[],
  last_login_at timestamptz
);

create table if not exists public.leads (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  customer_id text not null references public.customers(id) on update cascade on delete restrict,
  assigned_salesperson_id text references public.team_members(id) on update cascade on delete set null,
  source text not null default '',
  campaign text not null default '',
  received_at timestamptz,
  appointment_at timestamptz,
  pitched_at timestamptz,
  dispositioned_at timestamptz,
  status text not null default 'new' check (status in ('new', 'assigned', 'appointment_set', 'pitched', 'sold', 'lost', 'cancelled')),
  lost_reason text not null default '',
  notes text not null default ''
);

create table if not exists public.jobs (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  customer_id text not null references public.customers(id) on update cascade on delete restrict,
  lead_id text references public.leads(id) on update cascade on delete set null,
  salesperson_id text references public.team_members(id) on update cascade on delete set null,
  region text not null default '',
  location_name text not null default '',
  sold_date date not null,
  production_stage text not null default 'sold' check (production_stage in ('sold', 'contract_received', 'measure_requested', 'measured', 'material_list_received', 'materials_ordered', 'waiting_materials', 'materials_received', 'scheduled', 'in_progress', 'completed', 'funding_pending', 'collected', 'closed', 'cancelled')),
  payment_status text not null default 'not_invoiced' check (payment_status in ('not_invoiced', 'deposit_due', 'deposit_received', 'balance_due', 'funding_pending', 'partially_paid', 'paid', 'written_off')),
  payment_type text not null default '',
  financing_provider text not null default '',
  original_contract_amount numeric(14,2) not null default 0,
  final_amount numeric(14,2) not null default 0,
  deposit_amount numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  funded_at timestamptz,
  collected_at timestamptz,
  closed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text not null default '',
  decision_needed text not null default '',
  notes text not null default '',
  intake jsonb not null default '{}'::jsonb,
  permit jsonb not null default '{}'::jsonb,
  check (original_contract_amount >= 0),
  check (deposit_amount >= 0),
  check (amount_paid >= 0)
);

create table if not exists public.work_scopes (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  job_id text not null references public.jobs(id) on update cascade on delete cascade,
  category text not null check (length(trim(category)) > 0),
  description text not null default '',
  production_stage text not null default 'sold' check (production_stage in ('sold', 'contract_received', 'measure_requested', 'measured', 'material_list_received', 'materials_ordered', 'waiting_materials', 'materials_received', 'scheduled', 'in_progress', 'completed', 'funding_pending', 'collected', 'closed', 'cancelled')),
  priority text not null default '',
  measurer_id text references public.team_members(id) on update cascade on delete set null,
  measurer_name text not null default '',
  crew_id text references public.crews(id) on update cascade on delete set null,
  crew_name text not null default '',
  vendor text not null default '',
  dates jsonb not null default '{"measureRequested":"","measured":"","materialListReceived":"","materialsOrdered":"","materialEta":"","materialsReceived":"","scheduledInstall":"","started":"","completed":""}'::jsonb,
  specs jsonb not null default '{}'::jsonb,
  notes text not null default ''
);

create table if not exists public.change_orders (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  job_id text not null references public.jobs(id) on update cascade on delete cascade,
  work_scope_id text references public.work_scopes(id) on update cascade on delete set null,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'void')),
  requested_at timestamptz,
  approved_at timestamptz,
  description text not null check (length(trim(description)) > 0),
  reason text not null default '',
  amount numeric(14,2) not null default 0,
  customer_approved boolean not null default false,
  approved_by text references public.user_profiles(id) on update cascade on delete set null
);

create table if not exists public.status_events (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  entity_type text not null check (length(trim(entity_type)) > 0),
  entity_id text not null check (length(trim(entity_id)) > 0),
  from_status text not null default '',
  to_status text not null check (length(trim(to_status)) > 0),
  occurred_at timestamptz not null default now(),
  actor_user_id text references public.user_profiles(id) on update cascade on delete set null,
  note text not null default '',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.activity_logs (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'dashboard' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'local_only' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  actor_user_id text references public.user_profiles(id) on update cascade on delete set null,
  action text not null check (length(trim(action)) > 0),
  entity_type text not null check (length(trim(entity_type)) > 0),
  entity_id text not null check (length(trim(entity_id)) > 0),
  occurred_at timestamptz not null default now(),
  reason text not null default '',
  changed_fields jsonb not null default '[]'::jsonb,
  before_data jsonb,
  after_data jsonb,
  context jsonb not null default '{}'::jsonb
);

create table if not exists public.import_runs (
  id text primary key,
  model_version text not null default '3.0.0' check (model_version = '3.0.0'),
  record_status text not null default 'active' check (record_status in ('active', 'completed', 'closed', 'cancelled', 'archived')),
  source_system text not null default 'manual_import' check (source_system in ('dashboard', 'jobnimbus', 'spreadsheet', 'manual_import', 'accounting', 'calculated')),
  sync_state text not null default 'imported' check (sync_state in ('local_only', 'imported', 'synced', 'conflict', 'error')),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text,
  updated_at timestamptz not null default now(),
  updated_by text,
  revision integer not null default 1 check (revision > 0),
  import_type text not null default '',
  file_name text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  initiated_by text references public.user_profiles(id) on update cascade on delete set null,
  row_count integer not null default 0 check (row_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  warnings jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text references public.user_profiles(id) on update cascade on delete set null
);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

create or replace function public.validate_change_order_scope_job()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  scope_job_id text;
begin
  if new.work_scope_id is null then
    return new;
  end if;

  select job_id into scope_job_id
  from public.work_scopes
  where id = new.work_scope_id;

  if scope_job_id is null or scope_job_id <> new.job_id then
    raise exception 'Change order scope % does not belong to job %', new.work_scope_id, new.job_id;
  end if;

  return new;
end;
$$;

create trigger validate_change_order_scope_job_trigger
before insert or update of job_id, work_scope_id on public.change_orders
for each row execute function public.validate_change_order_scope_job();

create trigger customers_updated_metadata before update on public.customers for each row execute function public.set_record_updated_metadata();
create trigger team_members_updated_metadata before update on public.team_members for each row execute function public.set_record_updated_metadata();
create trigger crews_updated_metadata before update on public.crews for each row execute function public.set_record_updated_metadata();
create trigger user_profiles_updated_metadata before update on public.user_profiles for each row execute function public.set_record_updated_metadata();
create trigger leads_updated_metadata before update on public.leads for each row execute function public.set_record_updated_metadata();
create trigger jobs_updated_metadata before update on public.jobs for each row execute function public.set_record_updated_metadata();
create trigger work_scopes_updated_metadata before update on public.work_scopes for each row execute function public.set_record_updated_metadata();
create trigger change_orders_updated_metadata before update on public.change_orders for each row execute function public.set_record_updated_metadata();
create trigger import_runs_updated_metadata before update on public.import_runs for each row execute function public.set_record_updated_metadata();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists customers_display_name_idx on public.customers (lower(display_name));
create index if not exists customers_email_idx on public.customers (lower(email)) where email <> '';
create index if not exists customers_external_ids_gin_idx on public.customers using gin (external_ids);
create index if not exists team_members_display_name_idx on public.team_members (lower(display_name));
create index if not exists team_members_salesperson_idx on public.team_members (salesperson, active);
create index if not exists crews_active_idx on public.crews (active);
create index if not exists user_profiles_auth_user_id_idx on public.user_profiles (auth_user_id);
create index if not exists user_profiles_role_status_idx on public.user_profiles (role, status);
create index if not exists leads_customer_idx on public.leads (customer_id);
create index if not exists leads_salesperson_idx on public.leads (assigned_salesperson_id);
create index if not exists leads_status_received_idx on public.leads (status, received_at desc);
create index if not exists jobs_customer_idx on public.jobs (customer_id);
create index if not exists jobs_salesperson_idx on public.jobs (salesperson_id);
create index if not exists jobs_sold_date_idx on public.jobs (sold_date desc);
create index if not exists jobs_stage_idx on public.jobs (production_stage);
create index if not exists jobs_payment_status_idx on public.jobs (payment_status);
create index if not exists jobs_external_ids_gin_idx on public.jobs using gin (external_ids);
create index if not exists work_scopes_job_idx on public.work_scopes (job_id);
create index if not exists work_scopes_category_stage_idx on public.work_scopes (category, production_stage);
create index if not exists work_scopes_dates_gin_idx on public.work_scopes using gin (dates);
create index if not exists work_scopes_specs_gin_idx on public.work_scopes using gin (specs);
create index if not exists change_orders_job_idx on public.change_orders (job_id);
create index if not exists change_orders_scope_idx on public.change_orders (work_scope_id);
create index if not exists change_orders_status_idx on public.change_orders (status);
create index if not exists status_events_entity_idx on public.status_events (entity_type, entity_id, occurred_at desc);
create index if not exists activity_logs_entity_idx on public.activity_logs (entity_type, entity_id, occurred_at desc);
create index if not exists activity_logs_actor_idx on public.activity_logs (actor_user_id, occurred_at desc);
create index if not exists import_runs_started_idx on public.import_runs (started_at desc);

-- ---------------------------------------------------------------------------
-- Authentication/RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_app_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.user_profiles
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_profiles
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_active_app_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_user_id() is not null;
$$;

create or replace function public.can_manage_business_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'business_admin', 'operations_admin', 'sales_manager', 'production_manager'), false);
$$;

create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'business_admin'), false);
$$;

create or replace function public.can_manage_sales_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'business_admin', 'operations_admin', 'sales_manager'), false);
$$;

create or replace function public.can_manage_production_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('owner', 'business_admin', 'operations_admin', 'production_manager'), false);
$$;

grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_active_app_user() to authenticated;
grant execute on function public.can_manage_business_data() to authenticated;
grant execute on function public.can_manage_users() to authenticated;
grant execute on function public.can_manage_sales_data() to authenticated;
grant execute on function public.can_manage_production_data() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.team_members enable row level security;
alter table public.crews enable row level security;
alter table public.user_profiles enable row level security;
alter table public.leads enable row level security;
alter table public.jobs enable row level security;
alter table public.work_scopes enable row level security;
alter table public.change_orders enable row level security;
alter table public.status_events enable row level security;
alter table public.activity_logs enable row level security;
alter table public.import_runs enable row level security;
alter table public.app_settings enable row level security;

create policy customers_select_active on public.customers for select to authenticated using (public.is_active_app_user());
create policy customers_insert_sales on public.customers for insert to authenticated with check (public.can_manage_sales_data());
create policy customers_update_sales on public.customers for update to authenticated using (public.can_manage_sales_data()) with check (public.can_manage_sales_data());
create policy customers_delete_admin on public.customers for delete to authenticated using (public.can_manage_users());

create policy team_members_select_active on public.team_members for select to authenticated using (public.is_active_app_user());
create policy team_members_insert_admin on public.team_members for insert to authenticated with check (public.can_manage_users());
create policy team_members_update_admin on public.team_members for update to authenticated using (public.can_manage_users()) with check (public.can_manage_users());
create policy team_members_delete_admin on public.team_members for delete to authenticated using (public.can_manage_users());

create policy crews_select_active on public.crews for select to authenticated using (public.is_active_app_user());
create policy crews_insert_admin on public.crews for insert to authenticated with check (public.can_manage_business_data());
create policy crews_update_admin on public.crews for update to authenticated using (public.can_manage_business_data()) with check (public.can_manage_business_data());
create policy crews_delete_admin on public.crews for delete to authenticated using (public.can_manage_users());

create policy user_profiles_select_active on public.user_profiles for select to authenticated using (public.is_active_app_user());
create policy user_profiles_insert_admin on public.user_profiles for insert to authenticated with check (public.can_manage_users());
create policy user_profiles_update_admin on public.user_profiles for update to authenticated using (public.can_manage_users()) with check (public.can_manage_users());
create policy user_profiles_delete_admin on public.user_profiles for delete to authenticated using (public.current_app_role() = 'owner');

create policy leads_select_active on public.leads for select to authenticated using (public.is_active_app_user());
create policy leads_insert_sales on public.leads for insert to authenticated with check (public.can_manage_sales_data());
create policy leads_update_sales on public.leads for update to authenticated using (public.can_manage_sales_data()) with check (public.can_manage_sales_data());
create policy leads_delete_admin on public.leads for delete to authenticated using (public.can_manage_users());

create policy jobs_select_active on public.jobs for select to authenticated using (public.is_active_app_user());
create policy jobs_insert_business on public.jobs for insert to authenticated with check (public.can_manage_business_data());
create policy jobs_update_business on public.jobs for update to authenticated using (public.can_manage_business_data()) with check (public.can_manage_business_data());
create policy jobs_delete_admin on public.jobs for delete to authenticated using (public.can_manage_users());

create policy work_scopes_select_active on public.work_scopes for select to authenticated using (public.is_active_app_user());
create policy work_scopes_insert_production on public.work_scopes for insert to authenticated with check (public.can_manage_production_data());
create policy work_scopes_update_production on public.work_scopes for update to authenticated using (public.can_manage_production_data()) with check (public.can_manage_production_data());
create policy work_scopes_delete_admin on public.work_scopes for delete to authenticated using (public.can_manage_users());

create policy change_orders_select_active on public.change_orders for select to authenticated using (public.is_active_app_user());
create policy change_orders_insert_business on public.change_orders for insert to authenticated with check (public.can_manage_business_data());
create policy change_orders_update_business on public.change_orders for update to authenticated using (public.can_manage_business_data()) with check (public.can_manage_business_data());
create policy change_orders_delete_admin on public.change_orders for delete to authenticated using (public.can_manage_users());

create policy status_events_select_active on public.status_events for select to authenticated using (public.is_active_app_user());
create policy status_events_insert_active on public.status_events for insert to authenticated with check (public.is_active_app_user() and (actor_user_id is null or actor_user_id = public.current_app_user_id()));

create policy activity_logs_select_active on public.activity_logs for select to authenticated using (public.is_active_app_user());
create policy activity_logs_insert_active on public.activity_logs for insert to authenticated with check (public.is_active_app_user() and (actor_user_id is null or actor_user_id = public.current_app_user_id()));

create policy import_runs_select_active on public.import_runs for select to authenticated using (public.is_active_app_user());
create policy import_runs_insert_admin on public.import_runs for insert to authenticated with check (public.can_manage_business_data());
create policy import_runs_update_admin on public.import_runs for update to authenticated using (public.can_manage_business_data()) with check (public.can_manage_business_data());

create policy app_settings_select_active on public.app_settings for select to authenticated using (public.is_active_app_user());
create policy app_settings_insert_admin on public.app_settings for insert to authenticated with check (public.can_manage_users());
create policy app_settings_update_admin on public.app_settings for update to authenticated using (public.can_manage_users()) with check (public.can_manage_users());
create policy app_settings_delete_owner on public.app_settings for delete to authenticated using (public.current_app_role() = 'owner');

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.crews to authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert, update, delete on public.work_scopes to authenticated;
grant select, insert, update, delete on public.change_orders to authenticated;
grant select, insert on public.status_events to authenticated;
grant select, insert on public.activity_logs to authenticated;
grant select, insert, update on public.import_runs to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Admin/data-health views and RPC
-- ---------------------------------------------------------------------------

create or replace view public.v_backend_dataset_counts
with (security_invoker = true)
as
select 'customers'::text as collection, count(*)::bigint as record_count from public.customers
union all select 'leads', count(*) from public.leads
union all select 'jobs', count(*) from public.jobs
union all select 'work_scopes', count(*) from public.work_scopes
union all select 'change_orders', count(*) from public.change_orders
union all select 'status_events', count(*) from public.status_events
union all select 'activity_logs', count(*) from public.activity_logs
union all select 'user_profiles', count(*) from public.user_profiles
union all select 'team_members', count(*) from public.team_members
union all select 'crews', count(*) from public.crews
union all select 'import_runs', count(*) from public.import_runs;

create or replace view public.v_data_quality_issues
with (security_invoker = true)
as
select
  'job_without_scope'::text as issue_type,
  j.id as entity_id,
  'job'::text as entity_type,
  'Job has no work scope records.'::text as detail,
  'warning'::text as severity
from public.jobs j
left join public.work_scopes ws on ws.job_id = j.id and ws.record_status <> 'archived'
where j.record_status <> 'archived'
group by j.id
having count(ws.id) = 0
union all
select
  'completed_not_collected',
  j.id,
  'job',
  'Job is completed but payment status is not paid or written off.',
  'warning'
from public.jobs j
where j.production_stage in ('completed', 'funding_pending')
  and j.payment_status not in ('paid', 'written_off')
  and j.record_status <> 'archived'
union all
select
  'active_user_without_auth_account',
  up.id,
  'user_profile',
  'Active user profile is not linked to an authentication account.',
  'error'
from public.user_profiles up
where up.status = 'active' and up.auth_user_id is null
union all
select
  'scope_missing_assignment',
  ws.id,
  'work_scope',
  'Active work scope has neither a measurer nor a crew assigned.',
  'info'
from public.work_scopes ws
where ws.record_status = 'active'
  and ws.measurer_id is null
  and ws.crew_id is null
  and ws.production_stage not in ('completed', 'collected', 'closed', 'cancelled');

create or replace function public.get_backend_status()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'schema', 'mlb-dashboard-production-model',
    'modelVersion', '3.0.0',
    'serverTime', now(),
    'currentUserId', public.current_app_user_id(),
    'currentRole', public.current_app_role(),
    'counts', coalesce((select jsonb_object_agg(collection, record_count) from public.v_backend_dataset_counts), '{}'::jsonb),
    'qualityIssueCount', (select count(*) from public.v_data_quality_issues)
  );
$$;

grant select on public.v_backend_dataset_counts to authenticated;
grant select on public.v_data_quality_issues to authenticated;
grant execute on function public.get_backend_status() to authenticated;

insert into public.app_settings (key, value, description)
values
  ('production_model', '{"name":"mlb-dashboard-production-model","version":"3.0.0"}'::jsonb, 'Active production domain contract.'),
  ('shared_backend', '{"provider":"supabase","phase":4}'::jsonb, 'Shared backend implementation metadata.')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Realtime publication for shared operator views
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.customers;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.leads;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.jobs;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.work_scopes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.change_orders;
exception when duplicate_object then null;
end $$;

commit;
