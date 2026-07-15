import {
  createActivityLog,
  createChangeOrder,
  createCrew,
  createCustomer,
  createImportRun,
  createJob,
  createLead,
  createStatusEvent,
  createTeamMember,
  createUserProfile,
  createWorkScope,
} from '../../domain/entityFactories';

const text = (value) => (value === null || value === undefined ? '' : String(value));
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const nullable = (value) => (value === '' || value === undefined ? null : value);

const metadataToRow = (record) => ({
  id: record.id,
  model_version: record.modelVersion,
  record_status: record.recordStatus,
  source_system: record.sourceSystem,
  sync_state: record.syncState,
  external_ids: record.externalIds || {},
  created_at: record.createdAt,
  created_by: nullable(record.createdBy),
  updated_at: record.updatedAt,
  updated_by: nullable(record.updatedBy),
  revision: record.revision,
});

const metadataFromRow = (row) => ({
  id: row.id,
  modelVersion: row.model_version,
  recordStatus: row.record_status,
  sourceSystem: row.source_system,
  syncState: row.sync_state,
  externalIds: row.external_ids || {},
  createdAt: row.created_at,
  createdBy: text(row.created_by),
  updatedAt: row.updated_at,
  updatedBy: text(row.updated_by),
  revision: number(row.revision) || 1,
});

const customerToRow = (record) => ({
  ...metadataToRow(record),
  display_name: record.displayName,
  first_name: record.firstName,
  last_name: record.lastName,
  company_name: record.companyName,
  phone: record.phone,
  alternate_phone: record.alternatePhone,
  email: record.email,
  address: record.address || {},
  preferred_contact_method: record.preferredContactMethod,
  notes: record.notes,
  tags: record.tags || [],
});

const customerFromRow = (row) => createCustomer({
  ...metadataFromRow(row),
  displayName: row.display_name,
  firstName: row.first_name,
  lastName: row.last_name,
  companyName: row.company_name,
  phone: row.phone,
  alternatePhone: row.alternate_phone,
  email: row.email,
  address: row.address,
  preferredContactMethod: row.preferred_contact_method,
  notes: row.notes,
  tags: row.tags,
});

const teamMemberToRow = (record) => ({
  ...metadataToRow(record),
  display_name: record.displayName,
  employee_type: record.employeeType,
  department: record.department,
  salesperson: record.salesperson,
  production_staff: record.productionStaff,
  active: record.active,
  phone: record.phone,
  email: record.email,
  region_assignments: record.regionAssignments || [],
});

const teamMemberFromRow = (row) => createTeamMember({
  ...metadataFromRow(row),
  displayName: row.display_name,
  employeeType: row.employee_type,
  department: row.department,
  salesperson: row.salesperson,
  productionStaff: row.production_staff,
  active: row.active,
  phone: row.phone,
  email: row.email,
  regionAssignments: row.region_assignments,
});

const crewToRow = (record) => ({
  ...metadataToRow(record),
  name: record.name,
  crew_type: record.crewType,
  trade_categories: record.tradeCategories || [],
  lead_team_member_id: nullable(record.leadTeamMemberId),
  active: record.active,
  notes: record.notes,
});

const crewFromRow = (row) => createCrew({
  ...metadataFromRow(row),
  name: row.name,
  crewType: row.crew_type,
  tradeCategories: row.trade_categories,
  leadTeamMemberId: text(row.lead_team_member_id),
  active: row.active,
  notes: row.notes,
});

const userToRow = (record) => ({
  ...metadataToRow(record),
  auth_user_id: nullable(record.authUserId),
  display_name: record.displayName,
  email: record.email,
  role: record.role,
  status: record.status,
  team_member_id: nullable(record.teamMemberId),
  region_access: record.regionAccess || [],
  last_login_at: nullable(record.lastLoginAt),
});

const userFromRow = (row) => ({
  ...createUserProfile({
    ...metadataFromRow(row),
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    status: row.status,
    teamMemberId: text(row.team_member_id),
    regionAccess: row.region_access,
    lastLoginAt: text(row.last_login_at),
  }),
  authUserId: text(row.auth_user_id),
});

const leadToRow = (record) => ({
  ...metadataToRow(record),
  customer_id: record.customerId,
  assigned_salesperson_id: nullable(record.assignedSalespersonId),
  source: record.source,
  campaign: record.campaign,
  received_at: nullable(record.receivedAt),
  appointment_at: nullable(record.appointmentAt),
  pitched_at: nullable(record.pitchedAt),
  dispositioned_at: nullable(record.dispositionedAt),
  status: record.status,
  lost_reason: record.lostReason,
  notes: record.notes,
});

const leadFromRow = (row) => createLead({
  ...metadataFromRow(row),
  customerId: row.customer_id,
  assignedSalespersonId: text(row.assigned_salesperson_id),
  source: row.source,
  campaign: row.campaign,
  receivedAt: text(row.received_at),
  appointmentAt: text(row.appointment_at),
  pitchedAt: text(row.pitched_at),
  dispositionedAt: text(row.dispositioned_at),
  status: row.status,
  lostReason: row.lost_reason,
  notes: row.notes,
});

const jobToRow = (record) => ({
  ...metadataToRow(record),
  customer_id: record.customerId,
  lead_id: nullable(record.leadId),
  salesperson_id: nullable(record.salespersonId),
  region: record.region,
  location_name: record.locationName,
  sold_date: record.soldDate,
  production_stage: record.productionStage,
  payment_status: record.paymentStatus,
  payment_type: record.paymentType,
  financing_provider: record.financingProvider,
  original_contract_amount: record.originalContractAmount,
  final_amount: record.finalAmount,
  deposit_amount: record.depositAmount,
  amount_paid: record.amountPaid,
  balance_due: record.balanceDue,
  funded_at: nullable(record.fundedAt),
  collected_at: nullable(record.collectedAt),
  closed_at: nullable(record.closedAt),
  cancelled_at: nullable(record.cancelledAt),
  cancellation_reason: record.cancellationReason,
  decision_needed: record.decisionNeeded,
  notes: record.notes,
  intake: record.intake || {},
  permit: record.permit || {},
  thank_you_sent: Boolean(record.thankYouSent),
});

const jobFromRow = (row) => ({
  ...createJob({
    ...metadataFromRow(row),
    customerId: row.customer_id,
    leadId: text(row.lead_id),
    salespersonId: text(row.salesperson_id),
    region: row.region,
    locationName: row.location_name,
    soldDate: row.sold_date,
    productionStage: row.production_stage,
    paymentStatus: row.payment_status,
    paymentType: row.payment_type,
    financingProvider: row.financing_provider,
    originalContractAmount: number(row.original_contract_amount),
    finalAmount: number(row.final_amount),
    depositAmount: number(row.deposit_amount),
    amountPaid: number(row.amount_paid),
    balanceDue: number(row.balance_due),
    fundedAt: text(row.funded_at),
    collectedAt: text(row.collected_at),
    closedAt: text(row.closed_at),
    cancelledAt: text(row.cancelled_at),
    cancellationReason: row.cancellation_reason,
    decisionNeeded: row.decision_needed,
    notes: row.notes,
    intake: row.intake,
    permit: row.permit,
  }),
  thankYouSent: Boolean(row.thank_you_sent),
});

const workScopeToRow = (record) => ({
  ...metadataToRow(record),
  job_id: record.jobId,
  category: record.category,
  allocated_amount: record.allocatedAmount,
  description: record.description,
  production_stage: record.productionStage,
  priority: record.priority,
  measurer_id: nullable(record.measurerId),
  measurer_name: record.measurerName,
  crew_id: nullable(record.crewId),
  crew_name: record.crewName,
  vendor: record.vendor,
  dates: record.dates || {},
  specs: record.specs || {},
  notes: record.notes,
});

const workScopeFromRow = (row) => createWorkScope({
  ...metadataFromRow(row),
  jobId: row.job_id,
  category: row.category,
  allocatedAmount: row.allocated_amount === null ? null : number(row.allocated_amount),
  description: row.description,
  productionStage: row.production_stage,
  priority: row.priority,
  measurerId: text(row.measurer_id),
  measurerName: row.measurer_name,
  crewId: text(row.crew_id),
  crewName: row.crew_name,
  vendor: row.vendor,
  dates: row.dates,
  specs: row.specs,
  notes: row.notes,
});

const changeOrderToRow = (record) => ({
  ...metadataToRow(record),
  job_id: record.jobId,
  work_scope_id: nullable(record.workScopeId),
  status: record.status,
  requested_at: nullable(record.requestedAt),
  approved_at: nullable(record.approvedAt),
  description: record.description,
  reason: record.reason,
  amount: record.amount,
  customer_approved: record.customerApproved,
  approved_by: nullable(record.approvedBy),
});

const changeOrderFromRow = (row) => createChangeOrder({
  ...metadataFromRow(row),
  jobId: row.job_id,
  workScopeId: text(row.work_scope_id),
  status: row.status,
  requestedAt: text(row.requested_at),
  approvedAt: text(row.approved_at),
  description: row.description,
  reason: row.reason,
  amount: number(row.amount),
  customerApproved: row.customer_approved,
  approvedBy: text(row.approved_by),
});

const statusEventToRow = (record) => ({
  ...metadataToRow(record),
  entity_type: record.entityType,
  entity_id: record.entityId,
  from_status: record.fromStatus,
  to_status: record.toStatus,
  occurred_at: record.occurredAt,
  actor_user_id: nullable(record.actorUserId),
  note: record.note,
  metadata: record.metadata || {},
});

const statusEventFromRow = (row) => createStatusEvent({
  ...metadataFromRow(row),
  entityType: row.entity_type,
  entityId: row.entity_id,
  fromStatus: row.from_status,
  toStatus: row.to_status,
  occurredAt: row.occurred_at,
  actorUserId: text(row.actor_user_id),
  note: row.note,
  metadata: row.metadata,
});

const activityLogToRow = (record) => ({
  ...metadataToRow(record),
  actor_user_id: nullable(record.actorUserId),
  action: record.action,
  entity_type: record.entityType,
  entity_id: record.entityId,
  occurred_at: record.occurredAt,
  reason: record.reason,
  changed_fields: record.changedFields || [],
  before_data: record.before,
  after_data: record.after,
  context: record.context || {},
});

const activityLogFromRow = (row) => createActivityLog({
  ...metadataFromRow(row),
  actorUserId: text(row.actor_user_id),
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  occurredAt: row.occurred_at,
  reason: row.reason,
  changedFields: row.changed_fields,
  before: row.before_data,
  after: row.after_data,
  context: row.context,
});

const importRunToRow = (record) => ({
  ...metadataToRow(record),
  import_type: record.importType,
  file_name: record.fileName,
  started_at: record.startedAt,
  completed_at: nullable(record.completedAt),
  initiated_by: nullable(record.initiatedBy),
  row_count: record.rowCount,
  accepted_count: record.acceptedCount,
  rejected_count: record.rejectedCount,
  warnings: record.warnings || [],
  errors: record.errors || [],
});

const importRunFromRow = (row) => createImportRun({
  ...metadataFromRow(row),
  importType: row.import_type,
  fileName: row.file_name,
  startedAt: row.started_at,
  completedAt: text(row.completed_at),
  initiatedBy: text(row.initiated_by),
  rowCount: number(row.row_count),
  acceptedCount: number(row.accepted_count),
  rejectedCount: number(row.rejected_count),
  warnings: row.warnings,
  errors: row.errors,
});

export const SUPABASE_COLLECTIONS = Object.freeze({
  teamMembers: { table: 'team_members', toRow: teamMemberToRow, fromRow: teamMemberFromRow },
  crews: { table: 'crews', toRow: crewToRow, fromRow: crewFromRow },
  users: { table: 'user_profiles', toRow: userToRow, fromRow: userFromRow },
  customers: { table: 'customers', toRow: customerToRow, fromRow: customerFromRow },
  leads: { table: 'leads', toRow: leadToRow, fromRow: leadFromRow },
  jobs: { table: 'jobs', toRow: jobToRow, fromRow: jobFromRow },
  workScopes: { table: 'work_scopes', toRow: workScopeToRow, fromRow: workScopeFromRow },
  changeOrders: { table: 'change_orders', toRow: changeOrderToRow, fromRow: changeOrderFromRow },
  statusEvents: { table: 'status_events', toRow: statusEventToRow, fromRow: statusEventFromRow },
  activityLogs: { table: 'activity_logs', toRow: activityLogToRow, fromRow: activityLogFromRow },
  importRuns: { table: 'import_runs', toRow: importRunToRow, fromRow: importRunFromRow },
});

export const SUPABASE_SAVE_ORDER = [
  'teamMembers',
  'crews',
  'users',
  'customers',
  'leads',
  'jobs',
  'workScopes',
  'changeOrders',
  'statusEvents',
  'activityLogs',
  'importRuns',
];
