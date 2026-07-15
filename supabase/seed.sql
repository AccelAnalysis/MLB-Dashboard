-- Phase 4 local-development seed data.
-- This data is safe for local reset/testing and must not be treated as live MLB data.

insert into public.team_members (
  id, source_system, sync_state, display_name, employee_type, department,
  salesperson, production_staff, active, region_assignments
)
values
  ('TMB-DEMO-JACK', 'dashboard', 'synced', 'Jack', 'employee', 'Sales', true, false, true, array['Virginia']),
  ('TMB-DEMO-SARAH', 'dashboard', 'synced', 'Sarah', 'employee', 'Sales', true, false, true, array['Virginia']),
  ('TMB-DEMO-MIKE', 'dashboard', 'synced', 'Mike', 'employee', 'Sales', true, true, true, array['Virginia', 'Carolina']),
  ('TMB-DEMO-ALONZO', 'dashboard', 'synced', 'Alonzo', 'contractor', 'Production', false, true, true, array['Virginia']),
  ('TMB-DEMO-TITO', 'dashboard', 'synced', 'Tito', 'contractor', 'Production', false, true, true, array['Virginia'])
on conflict (id) do update set
  display_name = excluded.display_name,
  salesperson = excluded.salesperson,
  production_staff = excluded.production_staff,
  active = excluded.active,
  region_assignments = excluded.region_assignments;

insert into public.crews (
  id, source_system, sync_state, name, crew_type, trade_categories, active
)
values
  ('CRW-DEMO-TEAM-A', 'dashboard', 'synced', 'Team A', 'subcontractor', array['Windows', 'Siding'], true),
  ('CRW-DEMO-TEAM-B', 'dashboard', 'synced', 'Team B', 'subcontractor', array['Roofs', 'Gutters'], true)
on conflict (id) do update set
  name = excluded.name,
  crew_type = excluded.crew_type,
  trade_categories = excluded.trade_categories,
  active = excluded.active;

insert into public.user_profiles (
  id, source_system, sync_state, display_name, email, role, status,
  team_member_id, region_access
)
values
  ('USR-DEMO-OWNER', 'dashboard', 'local_only', 'MLB Owner', 'owner@example.invalid', 'owner', 'invited', null, array['Virginia', 'Carolina']),
  ('USR-DEMO-OPS', 'dashboard', 'local_only', 'Operations Admin', 'operations@example.invalid', 'operations_admin', 'invited', null, array['Virginia', 'Carolina']),
  ('USR-DEMO-WALLBOARD', 'dashboard', 'local_only', 'Office Wallboard', 'wallboard@example.invalid', 'wallboard', 'invited', null, array['Virginia'])
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  status = excluded.status,
  region_access = excluded.region_access;

insert into public.customers (
  id, source_system, sync_state, external_ids, display_name, phone, address, notes, tags
)
values
  (
    'CUS-DEMO-SMITH', 'dashboard', 'synced', '{"legacyProjectId":"P-1001"}'::jsonb,
    'Smith Family', '555-0101',
    '{"line1":"","line2":"","city":"Suffolk","county":"","state":"Virginia","postalCode":""}'::jsonb,
    'Dog in backyard. Finance approved through Greensky.', array['demo']
  ),
  (
    'CUS-DEMO-JONES', 'dashboard', 'synced', '{"legacyProjectId":"P-1002"}'::jsonb,
    'Jones Decking', '555-0202',
    '{"line1":"","line2":"","city":"Chesapeake","county":"","state":"Virginia","postalCode":""}'::jsonb,
    'HOA paperwork submitted by homeowner.', array['demo']
  ),
  (
    'CUS-DEMO-DAVIS', 'dashboard', 'synced', '{"legacyProjectId":"P-1003"}'::jsonb,
    'Davis Exterior', '555-0303',
    '{"line1":"","line2":"","city":"Elizabeth City","county":"","state":"Carolina","postalCode":""}'::jsonb,
    'Roof complete, waiting on gutters.', array['demo']
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  phone = excluded.phone,
  address = excluded.address,
  notes = excluded.notes,
  tags = excluded.tags;

insert into public.leads (
  id, source_system, sync_state, external_ids, customer_id,
  assigned_salesperson_id, source, received_at, status, notes
)
values
  ('LED-DEMO-1001', 'dashboard', 'synced', '{"legacyProjectId":"P-1001"}'::jsonb, 'CUS-DEMO-SMITH', 'TMB-DEMO-JACK', 'Website', now() - interval '16 days', 'sold', ''),
  ('LED-DEMO-1002', 'dashboard', 'synced', '{"legacyProjectId":"P-1002"}'::jsonb, 'CUS-DEMO-JONES', 'TMB-DEMO-SARAH', 'Referral', now() - interval '5 days', 'sold', ''),
  ('LED-DEMO-1003', 'dashboard', 'synced', '{"legacyProjectId":"P-1003"}'::jsonb, 'CUS-DEMO-DAVIS', 'TMB-DEMO-MIKE', 'Angi', now() - interval '46 days', 'sold', '')
on conflict (id) do update set
  customer_id = excluded.customer_id,
  assigned_salesperson_id = excluded.assigned_salesperson_id,
  source = excluded.source,
  status = excluded.status;

insert into public.jobs (
  id, source_system, sync_state, external_ids, customer_id, lead_id, salesperson_id,
  region, location_name, sold_date, production_stage, payment_status, payment_type,
  original_contract_amount, final_amount, deposit_amount, amount_paid, balance_due,
  decision_needed, notes, intake, permit
)
values
  (
    'JOB-DEMO-1001', 'dashboard', 'synced', '{"legacyProjectId":"P-1001"}'::jsonb,
    'CUS-DEMO-SMITH', 'LED-DEMO-1001', 'TMB-DEMO-JACK', 'Virginia', 'Suffolk', current_date - 15,
    'waiting_materials', 'deposit_received', 'Finance', 32000, 33500, 16000, 16000, 17500,
    '', 'Dog in backyard. Finance approved through Greensky.',
    '{"contractReceived":true,"documentsUploaded":true,"estimateApproved":true,"budgetCreated":true,"invoiceCreated":true,"fileCreated":true}'::jsonb,
    '{"required":true,"type":"Building","submittedAt":"","approvedAt":"","notes":""}'::jsonb
  ),
  (
    'JOB-DEMO-1002', 'dashboard', 'synced', '{"legacyProjectId":"P-1002"}'::jsonb,
    'CUS-DEMO-JONES', 'LED-DEMO-1002', 'TMB-DEMO-SARAH', 'Virginia', 'Chesapeake', current_date - 4,
    'measure_requested', 'deposit_received', 'Cash', 18500, 18500, 9250, 9250, 9250,
    'Jimmy needs to approve starter budget', 'HOA paperwork submitted by homeowner.',
    '{"contractReceived":true,"documentsUploaded":true,"estimateApproved":false,"budgetCreated":false,"invoiceCreated":false,"fileCreated":false}'::jsonb,
    '{"required":true,"type":"Zoning","submittedAt":"","approvedAt":"","notes":"Need HOA approval first"}'::jsonb
  ),
  (
    'JOB-DEMO-1003', 'dashboard', 'synced', '{"legacyProjectId":"P-1003"}'::jsonb,
    'CUS-DEMO-DAVIS', 'LED-DEMO-1003', 'TMB-DEMO-MIKE', 'Carolina', 'Elizabeth City', current_date - 45,
    'materials_received', 'balance_due', 'Finance', 25000, 25800, 0, 0, 25800,
    '', 'Roof complete, waiting on gutters.',
    '{"contractReceived":true,"documentsUploaded":true,"estimateApproved":true,"budgetCreated":true,"invoiceCreated":true,"fileCreated":true}'::jsonb,
    '{"required":false,"type":"","submittedAt":"","approvedAt":"","notes":""}'::jsonb
  )
on conflict (id) do update set
  customer_id = excluded.customer_id,
  lead_id = excluded.lead_id,
  salesperson_id = excluded.salesperson_id,
  sold_date = excluded.sold_date,
  production_stage = excluded.production_stage,
  payment_status = excluded.payment_status,
  original_contract_amount = excluded.original_contract_amount,
  final_amount = excluded.final_amount,
  deposit_amount = excluded.deposit_amount,
  amount_paid = excluded.amount_paid,
  balance_due = excluded.balance_due,
  intake = excluded.intake,
  permit = excluded.permit;

insert into public.work_scopes (
  id, source_system, sync_state, external_ids, job_id, category, production_stage,
  measurer_id, measurer_name, crew_id, crew_name, vendor, dates, specs, notes
)
values
  (
    'SCP-DEMO-1001-A', 'dashboard', 'synced', '{"legacyScopeId":"S-1001-A"}'::jsonb,
    'JOB-DEMO-1001', 'Windows', 'waiting_materials', 'TMB-DEMO-ALONZO', 'Alonzo', 'CRW-DEMO-TEAM-A', 'Team A', 'ABC Supply',
    jsonb_build_object(
      'measureRequested', (current_date - 14)::text,
      'measured', (current_date - 12)::text,
      'materialListReceived', (current_date - 11)::text,
      'materialsOrdered', (current_date - 10)::text,
      'materialEta', (current_date + 4)::text,
      'materialsReceived', '', 'scheduledInstall', '', 'started', '', 'completed', ''
    ),
    '{"Window Style":"Double Hung","Color":"White","Grid":"Yes","Quantity":"12"}'::jsonb,
    'Custom sizing on the bay window.'
  ),
  (
    'SCP-DEMO-1001-B', 'dashboard', 'synced', '{"legacyScopeId":"S-1001-B"}'::jsonb,
    'JOB-DEMO-1001', 'Siding', 'measured', 'TMB-DEMO-ALONZO', 'Alonzo', null, '', '',
    jsonb_build_object(
      'measureRequested', (current_date - 14)::text,
      'measured', (current_date - 12)::text,
      'materialListReceived', '', 'materialsOrdered', '', 'materialEta', '',
      'materialsReceived', '', 'scheduledInstall', '', 'started', '', 'completed', ''
    ),
    '{"Color":"Slate Blue","Trim":"White","House Wrap":"Yes"}'::jsonb,
    'Waiting on material list from Alonzo to order.'
  ),
  (
    'SCP-DEMO-1002-A', 'dashboard', 'synced', '{"legacyScopeId":"S-1002-A"}'::jsonb,
    'JOB-DEMO-1002', 'Decks', 'measure_requested', 'TMB-DEMO-TITO', 'Tito', null, '', '',
    jsonb_build_object(
      'measureRequested', (current_date - 3)::text,
      'measured', '', 'materialListReceived', '', 'materialsOrdered', '', 'materialEta', '',
      'materialsReceived', '', 'scheduledInstall', '', 'started', '', 'completed', ''
    ),
    '{"Material":"Trex","Color":"Spiced Rum","Railing":"Black Metal"}'::jsonb,
    'Needs measurement ASAP.'
  ),
  (
    'SCP-DEMO-1003-A', 'dashboard', 'synced', '{"legacyScopeId":"S-1003-A"}'::jsonb,
    'JOB-DEMO-1003', 'Roofs', 'completed', 'TMB-DEMO-MIKE', 'Mike', 'CRW-DEMO-TEAM-B', 'Team B', 'Beacon',
    jsonb_build_object(
      'measureRequested', (current_date - 44)::text,
      'measured', (current_date - 42)::text,
      'materialListReceived', (current_date - 42)::text,
      'materialsOrdered', (current_date - 40)::text,
      'materialEta', (current_date - 30)::text,
      'materialsReceived', (current_date - 29)::text,
      'scheduledInstall', (current_date - 20)::text,
      'started', (current_date - 20)::text,
      'completed', (current_date - 18)::text
    ),
    '{"Shingle":"Architectural","Color":"Charcoal","Drip Edge":"Black"}'::jsonb,
    'Completed.'
  ),
  (
    'SCP-DEMO-1003-B', 'dashboard', 'synced', '{"legacyScopeId":"S-1003-B"}'::jsonb,
    'JOB-DEMO-1003', 'Gutters', 'materials_received', 'TMB-DEMO-MIKE', 'Mike', null, '', 'Local Supply',
    jsonb_build_object(
      'measureRequested', (current_date - 44)::text,
      'measured', (current_date - 42)::text,
      'materialListReceived', (current_date - 42)::text,
      'materialsOrdered', (current_date - 40)::text,
      'materialEta', (current_date - 10)::text,
      'materialsReceived', (current_date - 8)::text,
      'scheduledInstall', '', 'started', '', 'completed', ''
    ),
    '{"Size":"6 inch","Color":"White","Guards":"Yes"}'::jsonb,
    'Materials are here, needs to be scheduled.'
  )
on conflict (id) do update set
  job_id = excluded.job_id,
  category = excluded.category,
  production_stage = excluded.production_stage,
  measurer_id = excluded.measurer_id,
  measurer_name = excluded.measurer_name,
  crew_id = excluded.crew_id,
  crew_name = excluded.crew_name,
  vendor = excluded.vendor,
  dates = excluded.dates,
  specs = excluded.specs,
  notes = excluded.notes;

insert into public.change_orders (
  id, source_system, sync_state, external_ids, job_id, work_scope_id, status,
  requested_at, approved_at, description, reason, amount, customer_approved
)
values
  (
    'CO-DEMO-1001-1', 'dashboard', 'synced', '{"legacyChangeOrderId":"1"}'::jsonb,
    'JOB-DEMO-1001', 'SCP-DEMO-1001-A', 'approved', now() - interval '5 days', now() - interval '5 days',
    'Added 2 extra windows', 'Customer requested added scope.', 1500, true
  ),
  (
    'CO-DEMO-1003-1', 'dashboard', 'synced', '{"legacyChangeOrderId":"1"}'::jsonb,
    'JOB-DEMO-1003', 'SCP-DEMO-1003-A', 'approved', now() - interval '30 days', now() - interval '30 days',
    'Bad wood replacement', 'Field condition discovered during production.', 800, true
  )
on conflict (id) do update set
  job_id = excluded.job_id,
  work_scope_id = excluded.work_scope_id,
  status = excluded.status,
  description = excluded.description,
  amount = excluded.amount,
  customer_approved = excluded.customer_approved;
