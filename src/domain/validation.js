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

const enumValues = (value) => Object.values(value);
const isText = (value) => typeof value === 'string';
const isNonEmptyText = (value) => isText(value) && value.trim().length > 0;
const isFiniteNumber = (value) => Number.isFinite(Number(value));
const isArray = Array.isArray;
const isObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));

const validateMetadata = (record, errors) => {
  if (!isNonEmptyText(record?.id)) errors.push('id is required');
  if (!enumValues(RECORD_STATUS).includes(record?.recordStatus)) errors.push('recordStatus is invalid');
  if (!enumValues(DATA_SOURCE).includes(record?.sourceSystem)) errors.push('sourceSystem is invalid');
  if (!enumValues(SYNC_STATE).includes(record?.syncState)) errors.push('syncState is invalid');
  if (!isObject(record?.externalIds)) errors.push('externalIds must be an object');
  if (!isNonEmptyText(record?.createdAt)) errors.push('createdAt is required');
  if (!isNonEmptyText(record?.updatedAt)) errors.push('updatedAt is required');
};

const result = (errors) => ({ valid: errors.length === 0, errors });

export const validateCustomer = (record) => {
  const errors = [];
  validateMetadata(record, errors);
  if (!isNonEmptyText(record?.displayName)) errors.push('displayName is required');
  if (!isObject(record?.address)) errors.push('address must be an object');
  if (!isArray(record?.tags)) errors.push('tags must be an array');
  return result(errors);
};

export const validateLead = (record) => {
  const errors = [];
  validateMetadata(record, errors);
  if (!isNonEmptyText(record?.customerId)) errors.push('customerId is required');
  if (!enumValues(LEAD_STATUS).includes(record?.status)) errors.push('status is invalid');
  return result(errors);
};

export const validateJob = (record) => {
  const errors = [];
  validateMetadata(record, errors);
  if (!isNonEmptyText(record?.customerId)) errors.push('customerId is required');
  if (!isNonEmptyText(record?.soldDate)) errors.push('soldDate is required');
  if (!enumValues(PRODUCTION_STAGE).includes(record?.productionStage)) errors.push('productionStage is invalid');
  if (!enumValues(PAYMENT_STATUS).includes(record?.paymentStatus)) errors.push('paymentStatus is invalid');
  if (!isFiniteNumber(record?.originalContractAmount)) errors.push('originalContractAmount must be numeric');
  if (!isFiniteNumber(record?.finalAmount)) errors.push('finalAmount must be numeric');
  if (!isFiniteNumber(record?.depositAmount)) errors.push('depositAmount must be numeric');
  if (!isObject(record?.intake)) errors.push('intake must be an object');
  if (!isObject(record?.permit)) errors.push('permit must be an object');
  return result(errors);
};

export const validateWorkScope = (record) => {
  const errors = [];
  validateMetadata(record, errors);
  if (!isNonEmptyText(record?.jobId)) errors.push('jobId is required');
  if (!isNonEmptyText(record?.category)) errors.push('category is required');
  if (!enumValues(PRODUCTION_STAGE).includes(record?.productionStage)) errors.push('productionStage is invalid');
  if (!isObject(record?.dates)) errors.push('dates must be an object');
  if (!isObject(record?.specs)) errors.push('specs must be an object');
  return result(errors);
};

export const validateChangeOrder = (record) => {
  const errors = [];
  validateMetadata(record, errors);
  if (!isNonEmptyText(record?.jobId)) errors.push('jobId is required');
  if (!enumValues(CHANGE_ORDER_STATUS).includes(record?.status)) errors.push('status is invalid');
  if (!isNonEmptyText(record?.description)) errors.push('description is required');
  if (!isFiniteNumber(record?.amount)) errors.push('amount must be numeric');
  return result(errors);
};

export const validateStatusEvent = (record) => {
  const errors = [];
  validateMetadata(record, errors);
  if (!isNonEmptyText(record?.entityType)) errors.push('entityType is required');
  if (!isNonEmptyText(record?.entityId)) errors.push('entityId is required');
  if (!isNonEmptyText(record?.toStatus)) errors.push('toStatus is required');
  if (!isNonEmptyText(record?.occurredAt)) errors.push('occurredAt is required');
  return result(errors);
};

export const validateActivityLog = (record) => {
  const errors = [];
  validateMetadata(record, errors);
  if (!isNonEmptyText(record?.action)) errors.push('action is required');
  if (!isNonEmptyText(record?.entityType)) errors.push('entityType is required');
  if (!isNonEmptyText(record?.entityId)) errors.push('entityId is required');
  if (!isNonEmptyText(record?.occurredAt)) errors.push('occurredAt is required');
  if (!isArray(record?.changedFields)) errors.push('changedFields must be an array');
  return result(errors);
};

export const validateUserProfile = (record) => {
  const errors = [];
  validateMetadata(record, errors);
  if (!isNonEmptyText(record?.displayName)) errors.push('displayName is required');
  if (!isNonEmptyText(record?.email)) errors.push('email is required');
  if (!enumValues(USER_ROLE).includes(record?.role)) errors.push('role is invalid');
  if (!enumValues(USER_STATUS).includes(record?.status)) errors.push('status is invalid');
  if (!isArray(record?.regionAccess)) errors.push('regionAccess must be an array');
  return result(errors);
};

export const validateProductionDataset = (dataset) => {
  const errors = [];
  const warnings = [];

  const requiredCollections = [
    'customers',
    'leads',
    'jobs',
    'workScopes',
    'changeOrders',
    'statusEvents',
    'activityLogs',
    'users',
    'teamMembers',
    'crews',
    'importRuns',
  ];

  requiredCollections.forEach((collection) => {
    if (!isArray(dataset?.[collection])) errors.push(`${collection} must be an array`);
  });

  if (errors.length) return { valid: false, errors, warnings };

  const customerIds = new Set(dataset.customers.map((item) => item.id));
  const jobIds = new Set(dataset.jobs.map((item) => item.id));
  const scopeIds = new Set(dataset.workScopes.map((item) => item.id));

  dataset.jobs.forEach((job) => {
    const validation = validateJob(job);
    validation.errors.forEach((message) => errors.push(`job ${job.id || '(missing id)'}: ${message}`));
    if (job.customerId && !customerIds.has(job.customerId)) errors.push(`job ${job.id} references missing customer ${job.customerId}`);
  });

  dataset.workScopes.forEach((scope) => {
    const validation = validateWorkScope(scope);
    validation.errors.forEach((message) => errors.push(`workScope ${scope.id || '(missing id)'}: ${message}`));
    if (scope.jobId && !jobIds.has(scope.jobId)) errors.push(`workScope ${scope.id} references missing job ${scope.jobId}`);
  });

  dataset.changeOrders.forEach((changeOrder) => {
    const validation = validateChangeOrder(changeOrder);
    validation.errors.forEach((message) => errors.push(`changeOrder ${changeOrder.id || '(missing id)'}: ${message}`));
    if (changeOrder.jobId && !jobIds.has(changeOrder.jobId)) errors.push(`changeOrder ${changeOrder.id} references missing job ${changeOrder.jobId}`);
    if (changeOrder.workScopeId && !scopeIds.has(changeOrder.workScopeId)) warnings.push(`changeOrder ${changeOrder.id} references missing optional scope ${changeOrder.workScopeId}`);
  });

  dataset.customers.forEach((customer) => {
    const validation = validateCustomer(customer);
    validation.errors.forEach((message) => errors.push(`customer ${customer.id || '(missing id)'}: ${message}`));
  });

  dataset.leads.forEach((lead) => {
    const validation = validateLead(lead);
    validation.errors.forEach((message) => errors.push(`lead ${lead.id || '(missing id)'}: ${message}`));
    if (lead.customerId && !customerIds.has(lead.customerId)) errors.push(`lead ${lead.id} references missing customer ${lead.customerId}`);
  });

  dataset.statusEvents.forEach((event) => {
    const validation = validateStatusEvent(event);
    validation.errors.forEach((message) => errors.push(`statusEvent ${event.id || '(missing id)'}: ${message}`));
  });

  dataset.activityLogs.forEach((activity) => {
    const validation = validateActivityLog(activity);
    validation.errors.forEach((message) => errors.push(`activity ${activity.id || '(missing id)'}: ${message}`));
  });

  dataset.users.forEach((user) => {
    const validation = validateUserProfile(user);
    validation.errors.forEach((message) => errors.push(`user ${user.id || '(missing id)'}: ${message}`));
  });

  return { valid: errors.length === 0, errors, warnings };
};
