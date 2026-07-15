import {
  CHANGE_ORDER_STATUS,
  LEAD_STATUS,
  PAYMENT_STATUS,
  PRODUCTION_STAGE,
  RECORD_STATUS,
} from './enums';

export const MANUAL_ENTRY_REGIONS = Object.freeze(['Virginia', 'Carolina']);
export const MANUAL_ENTRY_PRODUCT_CATEGORIES = Object.freeze([
  'Roofs',
  'Siding',
  'Windows',
  'Decks',
  'Gutters',
  'Doors',
  'Trim',
  'Repairs',
  'Misc',
]);

export const MANUAL_ENTRY_TABS = Object.freeze([
  { id: 'customer', label: 'Customer & Sale' },
  { id: 'production', label: 'Production & Scopes' },
  { id: 'financial', label: 'Financials & Closeout' },
  { id: 'review', label: 'Review & Save' },
]);

const today = () => new Date().toISOString().slice(0, 10);
const text = (value) => (value === null || value === undefined ? '' : String(value));
const number = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const createEmptyManualScope = () => ({
  id: '',
  revision: 0,
  existing: false,
  removed: false,
  category: 'Roofs',
  description: '',
  productionStage: PRODUCTION_STAGE.SOLD,
  priority: 'normal',
  measurerId: '',
  measurerName: '',
  crewId: '',
  crewName: '',
  vendor: '',
  dates: {
    measureRequested: '',
    measured: '',
    materialListReceived: '',
    materialsOrdered: '',
    materialEta: '',
    materialsReceived: '',
    scheduledInstall: '',
    started: '',
    completed: '',
  },
  specsText: '',
  notes: '',
});

export const createEmptyManualChangeOrder = () => ({
  id: '',
  revision: 0,
  existing: false,
  removed: false,
  workScopeId: '',
  status: CHANGE_ORDER_STATUS.DRAFT,
  requestedAt: today(),
  approvedAt: '',
  description: '',
  reason: '',
  amount: '',
  customerApproved: false,
  approvedBy: '',
});

export const createEmptyManualEntryDraft = (profile = null) => ({
  mode: 'new',
  ids: { customerId: '', leadId: '', jobId: '' },
  revisions: { customer: 0, lead: 0, job: 0 },
  customer: {
    displayName: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    alternatePhone: '',
    email: '',
    preferredContactMethod: 'Phone',
    address: { line1: '', line2: '', city: '', county: '', state: 'VA', postalCode: '' },
    notes: '',
  },
  lead: {
    assignedSalespersonId: profile?.teamMemberId || '',
    source: '',
    campaign: '',
    receivedAt: today(),
    status: LEAD_STATUS.SOLD,
    notes: '',
  },
  job: {
    salespersonId: profile?.teamMemberId || '',
    region: 'Virginia',
    locationName: '',
    soldDate: today(),
    productionStage: PRODUCTION_STAGE.SOLD,
    paymentStatus: PAYMENT_STATUS.NOT_INVOICED,
    paymentType: 'Finance',
    financingProvider: '',
    originalContractAmount: '',
    finalAmount: '',
    depositAmount: '',
    amountPaid: '',
    fundedAt: '',
    collectedAt: '',
    closedAt: '',
    cancelledAt: '',
    cancellationReason: '',
    decisionNeeded: '',
    notes: '',
    thankYouSent: false,
    intake: {
      contractReceived: false,
      documentsUploaded: false,
      estimateApproved: false,
      budgetCreated: false,
      invoiceCreated: false,
      fileCreated: false,
    },
    permit: {
      required: false,
      type: '',
      submittedAt: '',
      approvedAt: '',
      notes: '',
    },
  },
  scopes: [createEmptyManualScope()],
  changeOrders: [],
});

export const specsObjectToText = (specs = {}) => Object.entries(specs || {})
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n');

export const specsTextToObject = (value = '') => text(value)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .reduce((result, line) => {
    const separator = line.indexOf(':');
    if (separator === -1) {
      result[line] = '';
      return result;
    }
    const key = line.slice(0, separator).trim();
    if (!key) return result;
    result[key] = line.slice(separator + 1).trim();
    return result;
  }, {});

const activeRecord = (record) => record?.recordStatus !== RECORD_STATUS.ARCHIVED;

export const createManualEntryDraftFromDataset = (dataset, jobId) => {
  const job = (dataset.jobs || []).find((record) => record.id === jobId && activeRecord(record));
  if (!job) return null;

  const customer = (dataset.customers || []).find((record) => record.id === job.customerId) || {};
  const lead = (dataset.leads || []).find((record) => record.id === job.leadId) || {};
  const scopes = (dataset.workScopes || [])
    .filter((record) => record.jobId === job.id && activeRecord(record))
    .map((record) => ({
      id: record.id,
      revision: record.revision,
      existing: true,
      removed: false,
      category: record.category,
      description: record.description,
      productionStage: record.productionStage,
      priority: record.priority || 'normal',
      measurerId: record.measurerId,
      measurerName: record.measurerName,
      crewId: record.crewId,
      crewName: record.crewName,
      vendor: record.vendor,
      dates: { ...createEmptyManualScope().dates, ...(record.dates || {}) },
      specsText: specsObjectToText(record.specs),
      notes: record.notes,
    }));
  const changeOrders = (dataset.changeOrders || [])
    .filter((record) => record.jobId === job.id && activeRecord(record))
    .map((record) => ({
      id: record.id,
      revision: record.revision,
      existing: true,
      removed: record.status === CHANGE_ORDER_STATUS.VOID,
      workScopeId: record.workScopeId,
      status: record.status,
      requestedAt: record.requestedAt,
      approvedAt: record.approvedAt,
      description: record.description,
      reason: record.reason,
      amount: record.amount,
      customerApproved: record.customerApproved,
      approvedBy: record.approvedBy,
    }));

  return {
    mode: 'edit',
    ids: { customerId: customer.id || '', leadId: lead.id || '', jobId: job.id },
    revisions: {
      customer: customer.revision || 0,
      lead: lead.revision || 0,
      job: job.revision || 0,
    },
    customer: {
      displayName: customer.displayName || '',
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      companyName: customer.companyName || '',
      phone: customer.phone || '',
      alternatePhone: customer.alternatePhone || '',
      email: customer.email || '',
      preferredContactMethod: customer.preferredContactMethod || 'Phone',
      address: {
        line1: customer.address?.line1 || '',
        line2: customer.address?.line2 || '',
        city: customer.address?.city || '',
        county: customer.address?.county || '',
        state: customer.address?.state || '',
        postalCode: customer.address?.postalCode || '',
      },
      notes: customer.notes || '',
    },
    lead: {
      assignedSalespersonId: lead.assignedSalespersonId || job.salespersonId || '',
      source: lead.source || '',
      campaign: lead.campaign || '',
      receivedAt: lead.receivedAt ? String(lead.receivedAt).slice(0, 10) : '',
      status: lead.status || LEAD_STATUS.SOLD,
      notes: lead.notes || '',
    },
    job: {
      salespersonId: job.salespersonId || '',
      region: job.region || 'Virginia',
      locationName: job.locationName || customer.address?.city || '',
      soldDate: job.soldDate || '',
      productionStage: job.productionStage,
      paymentStatus: job.paymentStatus,
      paymentType: job.paymentType || '',
      financingProvider: job.financingProvider || '',
      originalContractAmount: job.originalContractAmount,
      finalAmount: job.finalAmount || '',
      depositAmount: job.depositAmount,
      amountPaid: job.amountPaid,
      fundedAt: job.fundedAt ? String(job.fundedAt).slice(0, 10) : '',
      collectedAt: job.collectedAt ? String(job.collectedAt).slice(0, 10) : '',
      closedAt: job.closedAt ? String(job.closedAt).slice(0, 10) : '',
      cancelledAt: job.cancelledAt ? String(job.cancelledAt).slice(0, 10) : '',
      cancellationReason: job.cancellationReason || '',
      decisionNeeded: job.decisionNeeded || '',
      notes: job.notes || '',
      thankYouSent: Boolean(job.thankYouSent),
      intake: {
        ...createEmptyManualEntryDraft().job.intake,
        ...(job.intake || {}),
      },
      permit: {
        ...createEmptyManualEntryDraft().job.permit,
        ...(job.permit || {}),
        submittedAt: job.permit?.submittedAt ? String(job.permit.submittedAt).slice(0, 10) : '',
        approvedAt: job.permit?.approvedAt ? String(job.permit.approvedAt).slice(0, 10) : '',
      },
    },
    scopes: scopes.length ? scopes : [createEmptyManualScope()],
    changeOrders,
  };
};

export const calculateManualEntryFinancials = (draft) => {
  const approvedChangeOrders = (draft.changeOrders || [])
    .filter((record) => !record.removed && record.status === CHANGE_ORDER_STATUS.APPROVED)
    .reduce((sum, record) => sum + number(record.amount), 0);
  const originalAmount = number(draft.job?.originalContractAmount);
  const revisedAmount = originalAmount + approvedChangeOrders;
  const explicitFinal = draft.job?.finalAmount === '' ? null : number(draft.job?.finalAmount);
  const effectiveFinalAmount = explicitFinal === null ? revisedAmount : explicitFinal;
  const amountPaid = number(draft.job?.amountPaid);
  return {
    originalAmount,
    approvedChangeOrders,
    revisedAmount,
    effectiveFinalAmount,
    amountPaid,
    balanceDue: Math.max(0, effectiveFinalAmount - amountPaid),
  };
};

const chronologicalFields = [
  ['measureRequested', 'Measure requested'],
  ['measured', 'Measured'],
  ['materialListReceived', 'Material list received'],
  ['materialsOrdered', 'Materials ordered'],
  ['materialEta', 'Material ETA'],
  ['materialsReceived', 'Materials received'],
  ['scheduledInstall', 'Scheduled install'],
  ['started', 'Started'],
  ['completed', 'Completed'],
];

const validateScopeDates = (scope, index, errors) => {
  let previous = null;
  chronologicalFields.forEach(([key, label]) => {
    const value = scope.dates?.[key];
    if (!value) return;
    if (previous && value < previous.value) {
      errors.push(`Scope ${index + 1}: ${label} cannot be before ${previous.label}.`);
    }
    previous = { value, label };
  });
};

export const validateManualEntryDraft = (draft, options = {}) => {
  const errors = [];
  const warnings = [];
  const activeScopes = (draft.scopes || []).filter((scope) => !scope.removed);

  if (!draft.customer?.displayName?.trim()) errors.push('Customer or company name is required.');
  if (!draft.job?.soldDate) errors.push('Date sold is required.');
  if (!MANUAL_ENTRY_REGIONS.includes(draft.job?.region)) errors.push('A valid operating region is required.');
  if (number(draft.job?.originalContractAmount) < 0) errors.push('Original contract amount cannot be negative.');
  if (!activeScopes.length) errors.push('At least one active work scope is required.');

  activeScopes.forEach((scope, index) => {
    if (!scope.category?.trim()) errors.push(`Scope ${index + 1}: product category is required.`);
    validateScopeDates(scope, index, errors);
  });

  (draft.changeOrders || []).filter((record) => !record.removed).forEach((record, index) => {
    if (!record.description?.trim()) errors.push(`Change order ${index + 1}: description is required.`);
    if (record.status === CHANGE_ORDER_STATUS.APPROVED && !record.approvedAt) {
      warnings.push(`Change order ${index + 1} is approved but has no approval date.`);
    }
  });

  if (draft.job?.permit?.approvedAt && draft.job?.permit?.submittedAt
      && draft.job.permit.approvedAt < draft.job.permit.submittedAt) {
    errors.push('Permit approval date cannot be before the permit submission date.');
  }

  if (draft.job?.productionStage === PRODUCTION_STAGE.CANCELLED || draft.job?.cancelledAt) {
    if (!draft.job.cancelledAt) errors.push('Cancellation date is required for a cancelled job.');
    if (!draft.job.cancellationReason?.trim()) errors.push('Cancellation reason is required for a cancelled job.');
  }

  if (!draft.customer?.phone?.trim() && !draft.customer?.email?.trim()) {
    warnings.push('Add a phone number or email so the customer record has a contact path.');
  }
  if (!draft.job?.salespersonId) warnings.push('No salesperson is assigned; sales scorecards will show this job as unassigned.');
  if (!draft.lead?.source?.trim()) warnings.push('Lead source is blank; lead-source reporting will be incomplete.');
  if (draft.job?.permit?.required && !draft.job?.permit?.type?.trim()) warnings.push('A permit is marked required but no permit type is recorded.');

  const financials = calculateManualEntryFinancials(draft);
  if (financials.amountPaid > financials.effectiveFinalAmount) {
    warnings.push('Amount paid exceeds the effective final amount; verify the financial figures.');
  }

  if (options.isNew && !options.canCreate) errors.push('Your role cannot create a new sold job.');

  return { valid: errors.length === 0, errors, warnings, financials };
};

export const summarizeManualEntryJobs = (dataset = {}) => {
  const customerById = new Map((dataset.customers || []).map((record) => [record.id, record]));
  const scopesByJob = new Map();
  (dataset.workScopes || []).filter(activeRecord).forEach((scope) => {
    const scopes = scopesByJob.get(scope.jobId) || [];
    scopes.push(scope);
    scopesByJob.set(scope.jobId, scopes);
  });

  return (dataset.jobs || [])
    .filter(activeRecord)
    .map((job) => {
      const customer = customerById.get(job.customerId) || {};
      const scopes = scopesByJob.get(job.id) || [];
      return {
        id: job.id,
        customerName: customer.displayName || job.locationName || job.id,
        city: job.locationName || customer.address?.city || '',
        region: job.region,
        soldDate: job.soldDate,
        productionStage: job.productionStage,
        paymentStatus: job.paymentStatus,
        scopeCount: scopes.length,
        scopeCategories: scopes.map((scope) => scope.category).filter(Boolean),
        decisionNeeded: job.decisionNeeded,
        cancelled: job.productionStage === PRODUCTION_STAGE.CANCELLED || Boolean(job.cancelledAt),
        revision: job.revision,
      };
    })
    .sort((left, right) => String(right.soldDate).localeCompare(String(left.soldDate)));
};
