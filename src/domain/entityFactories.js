import {
  CHANGE_ORDER_STATUS,
  DATA_SOURCE,
  LEAD_STATUS,
  PAYMENT_STATUS,
  PRODUCTION_STAGE,
  RECORD_STATUS,
  SYNC_STATE,
  USER_ROLE,
  USER_STATUS,
} from './enums';
import { createRecordId } from './recordIds';
import { PRODUCTION_MODEL_VERSION } from './modelVersion';

const nowIso = () => new Date().toISOString();
const cleanText = (value) => (value === null || value === undefined ? '' : String(value).trim());
const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const asBoolean = (value) => Boolean(value);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asArray = (value) => (Array.isArray(value) ? value : []);

export const createRecordMetadata = (entityType, input = {}) => {
  const timestamp = input.updatedAt || input.createdAt || nowIso();
  return {
    id: cleanText(input.id) || createRecordId(entityType),
    modelVersion: PRODUCTION_MODEL_VERSION,
    recordStatus: input.recordStatus || RECORD_STATUS.ACTIVE,
    sourceSystem: input.sourceSystem || DATA_SOURCE.DASHBOARD,
    syncState: input.syncState || SYNC_STATE.LOCAL_ONLY,
    externalIds: asObject(input.externalIds),
    createdAt: input.createdAt || timestamp,
    createdBy: cleanText(input.createdBy),
    updatedAt: input.updatedAt || timestamp,
    updatedBy: cleanText(input.updatedBy),
    revision: Math.max(1, Number(input.revision) || 1),
  };
};

export const createCustomer = (input = {}) => ({
  ...createRecordMetadata('customer', input),
  displayName: cleanText(input.displayName || input.name),
  firstName: cleanText(input.firstName),
  lastName: cleanText(input.lastName),
  companyName: cleanText(input.companyName),
  phone: cleanText(input.phone),
  alternatePhone: cleanText(input.alternatePhone),
  email: cleanText(input.email).toLowerCase(),
  address: {
    line1: cleanText(input.address?.line1),
    line2: cleanText(input.address?.line2),
    city: cleanText(input.address?.city || input.city),
    county: cleanText(input.address?.county || input.county),
    state: cleanText(input.address?.state || input.state),
    postalCode: cleanText(input.address?.postalCode || input.postalCode),
  },
  preferredContactMethod: cleanText(input.preferredContactMethod),
  notes: cleanText(input.notes),
  tags: asArray(input.tags).map(cleanText).filter(Boolean),
});

export const createLead = (input = {}) => ({
  ...createRecordMetadata('lead', input),
  customerId: cleanText(input.customerId),
  assignedSalespersonId: cleanText(input.assignedSalespersonId),
  source: cleanText(input.source),
  campaign: cleanText(input.campaign),
  receivedAt: cleanText(input.receivedAt),
  appointmentAt: cleanText(input.appointmentAt),
  pitchedAt: cleanText(input.pitchedAt),
  dispositionedAt: cleanText(input.dispositionedAt),
  status: input.status || LEAD_STATUS.NEW,
  lostReason: cleanText(input.lostReason),
  notes: cleanText(input.notes),
});

export const createJob = (input = {}) => ({
  ...createRecordMetadata('job', input),
  customerId: cleanText(input.customerId),
  leadId: cleanText(input.leadId),
  salespersonId: cleanText(input.salespersonId),
  region: cleanText(input.region),
  locationName: cleanText(input.locationName),
  soldDate: cleanText(input.soldDate || input.dateSold),
  productionStage: input.productionStage || PRODUCTION_STAGE.SOLD,
  paymentStatus: input.paymentStatus || PAYMENT_STATUS.NOT_INVOICED,
  paymentType: cleanText(input.paymentType),
  financingProvider: cleanText(input.financingProvider),
  originalContractAmount: asNumber(input.originalContractAmount ?? input.originalAmount),
  finalAmount: asNumber(input.finalAmount),
  depositAmount: asNumber(input.depositAmount ?? input.deposit),
  amountPaid: asNumber(input.amountPaid),
  balanceDue: asNumber(input.balanceDue),
  fundedAt: cleanText(input.fundedAt),
  collectedAt: cleanText(input.collectedAt),
  closedAt: cleanText(input.closedAt),
  cancelledAt: cleanText(input.cancelledAt || input.cancellationDate),
  cancellationReason: cleanText(input.cancellationReason),
  decisionNeeded: cleanText(input.decisionNeeded),
  notes: cleanText(input.notes),
  intake: {
    contractReceived: asBoolean(input.intake?.contractReceived),
    documentsUploaded: asBoolean(input.intake?.documentsUploaded ?? input.intake?.uploadedJN),
    estimateApproved: asBoolean(input.intake?.estimateApproved),
    budgetCreated: asBoolean(input.intake?.budgetCreated),
    invoiceCreated: asBoolean(input.intake?.invoiceCreated),
    fileCreated: asBoolean(input.intake?.fileCreated),
  },
  permit: {
    required: asBoolean(input.permit?.required ?? input.permits?.required),
    type: cleanText(input.permit?.type ?? input.permits?.type),
    submittedAt: cleanText(input.permit?.submittedAt ?? input.permits?.submittedDate),
    approvedAt: cleanText(input.permit?.approvedAt ?? input.permits?.approvedDate),
    notes: cleanText(input.permit?.notes ?? input.permits?.notes),
  },
});

export const createWorkScope = (input = {}) => ({
  ...createRecordMetadata('workScope', input),
  jobId: cleanText(input.jobId),
  category: cleanText(input.category || input.type),
  allocatedAmount: input.allocatedAmount === '' || input.allocatedAmount === null || input.allocatedAmount === undefined
    ? null
    : asNumber(input.allocatedAmount),
  description: cleanText(input.description),
  productionStage: input.productionStage || PRODUCTION_STAGE.SOLD,
  priority: cleanText(input.priority || 'normal'),
  measurerId: cleanText(input.measurerId),
  measurerName: cleanText(input.measurerName || input.measurer),
  crewId: cleanText(input.crewId),
  crewName: cleanText(input.crewName || input.crew),
  vendor: cleanText(input.vendor),
  dates: {
    measureRequested: cleanText(input.dates?.measureRequested ?? input.measureRequested),
    measured: cleanText(input.dates?.measured ?? input.measureCompleted),
    materialListReceived: cleanText(input.dates?.materialListReceived ?? input.materialListReceived),
    materialsOrdered: cleanText(input.dates?.materialsOrdered ?? input.dateOrdered),
    materialEta: cleanText(input.dates?.materialEta ?? input.materialETA),
    materialsReceived: cleanText(input.dates?.materialsReceived ?? input.materialsIn),
    scheduledInstall: cleanText(input.dates?.scheduledInstall ?? input.scheduledInstallDate),
    started: cleanText(input.dates?.started ?? input.startDate),
    completed: cleanText(input.dates?.completed ?? input.completionDate),
  },
  specs: asObject(input.specs),
  notes: cleanText(input.notes),
});

export const createChangeOrder = (input = {}) => ({
  ...createRecordMetadata('changeOrder', input),
  jobId: cleanText(input.jobId),
  workScopeId: cleanText(input.workScopeId),
  status: input.status || CHANGE_ORDER_STATUS.DRAFT,
  requestedAt: cleanText(input.requestedAt || input.date),
  approvedAt: cleanText(input.approvedAt),
  description: cleanText(input.description),
  reason: cleanText(input.reason),
  amount: asNumber(input.amount),
  customerApproved: asBoolean(input.customerApproved),
  approvedBy: cleanText(input.approvedBy),
});

export const createStatusEvent = (input = {}) => ({
  ...createRecordMetadata('statusEvent', input),
  entityType: cleanText(input.entityType),
  entityId: cleanText(input.entityId),
  fromStatus: cleanText(input.fromStatus),
  toStatus: cleanText(input.toStatus),
  occurredAt: cleanText(input.occurredAt) || nowIso(),
  actorUserId: cleanText(input.actorUserId),
  note: cleanText(input.note),
  metadata: asObject(input.metadata),
});

export const createActivityLog = (input = {}) => ({
  ...createRecordMetadata('activity', input),
  actorUserId: cleanText(input.actorUserId),
  action: cleanText(input.action),
  entityType: cleanText(input.entityType),
  entityId: cleanText(input.entityId),
  occurredAt: cleanText(input.occurredAt) || nowIso(),
  reason: cleanText(input.reason),
  changedFields: asArray(input.changedFields),
  before: input.before ?? null,
  after: input.after ?? null,
  context: asObject(input.context),
});

export const createUserProfile = (input = {}) => ({
  ...createRecordMetadata('user', input),
  displayName: cleanText(input.displayName),
  email: cleanText(input.email).toLowerCase(),
  role: input.role || USER_ROLE.VIEWER,
  status: input.status || USER_STATUS.INVITED,
  teamMemberId: cleanText(input.teamMemberId),
  regionAccess: asArray(input.regionAccess).map(cleanText).filter(Boolean),
  lastLoginAt: cleanText(input.lastLoginAt),
});

export const createTeamMember = (input = {}) => ({
  ...createRecordMetadata('teamMember', input),
  displayName: cleanText(input.displayName || input.name),
  employeeType: cleanText(input.employeeType),
  department: cleanText(input.department),
  salesperson: asBoolean(input.salesperson),
  productionStaff: asBoolean(input.productionStaff),
  active: input.active === undefined ? true : asBoolean(input.active),
  phone: cleanText(input.phone),
  email: cleanText(input.email).toLowerCase(),
  regionAssignments: asArray(input.regionAssignments).map(cleanText).filter(Boolean),
});

export const createCrew = (input = {}) => ({
  ...createRecordMetadata('crew', input),
  name: cleanText(input.name),
  crewType: cleanText(input.crewType),
  tradeCategories: asArray(input.tradeCategories).map(cleanText).filter(Boolean),
  leadTeamMemberId: cleanText(input.leadTeamMemberId),
  active: input.active === undefined ? true : asBoolean(input.active),
  notes: cleanText(input.notes),
});

export const createImportRun = (input = {}) => ({
  ...createRecordMetadata('importRun', input),
  importType: cleanText(input.importType),
  sourceSystem: input.sourceSystem || DATA_SOURCE.MANUAL_IMPORT,
  fileName: cleanText(input.fileName),
  startedAt: cleanText(input.startedAt) || nowIso(),
  completedAt: cleanText(input.completedAt),
  initiatedBy: cleanText(input.initiatedBy),
  rowCount: asNumber(input.rowCount),
  acceptedCount: asNumber(input.acceptedCount),
  rejectedCount: asNumber(input.rejectedCount),
  warnings: asArray(input.warnings),
  errors: asArray(input.errors),
});
