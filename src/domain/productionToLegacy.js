import { PAYMENT_STATUS, PRODUCTION_STAGE, RECORD_STATUS } from './enums';
import { normalizeLegacyProjects } from './legacyProjectAdapter';

const stripLegacyPrefix = (value, prefix) => {
  const text = String(value || '');
  const marker = `${prefix}-LEGACY-`;
  return text.startsWith(marker) ? text.slice(marker.length) : text;
};

const legacyRecordId = (record, prefix, preferredKeys = []) => {
  const externalIds = record?.externalIds || {};
  for (const key of preferredKeys) {
    if (externalIds[key]) return String(externalIds[key]);
  }

  if (externalIds.legacyDashboard) {
    return stripLegacyPrefix(externalIds.legacyDashboard, prefix);
  }

  return stripLegacyPrefix(record?.id, prefix) || record?.id || '';
};

const isActiveRecord = (record) => record?.recordStatus !== RECORD_STATUS.ARCHIVED;

const isCollected = (job) => Boolean(
  job.collectedAt
  || job.paymentStatus === PAYMENT_STATUS.PAID
  || job.paymentStatus === PAYMENT_STATUS.WRITTEN_OFF
  || job.productionStage === PRODUCTION_STAGE.COLLECTED
  || job.productionStage === PRODUCTION_STAGE.CLOSED,
);

const toLegacyChangeOrder = (record, index) => ({
  id: legacyRecordId(record, 'CO', ['legacyChangeOrderId']) || index + 1,
  date: record.approvedAt || record.requestedAt || '',
  description: record.description || '',
  amount: Number(record.amount || 0),
  _production: {
    changeOrderId: record.id,
    revision: Number(record.revision || 0),
  },
});

const toLegacyScope = (record) => ({
  id: legacyRecordId(record, 'SCP', ['legacyScopeId']),
  type: record.category || '',
  measurer: record.measurerName || '',
  measureRequested: record.dates?.measureRequested || '',
  measureCompleted: record.dates?.measured || '',
  materialListReceived: record.dates?.materialListReceived || '',
  dateOrdered: record.dates?.materialsOrdered || '',
  vendor: record.vendor || '',
  materialETA: record.dates?.materialEta || '',
  materialsIn: record.dates?.materialsReceived || '',
  crew: record.crewName || '',
  scheduledInstallDate: record.dates?.scheduledInstall || '',
  startDate: record.dates?.started || '',
  completionDate: record.dates?.completed || '',
  specs: record.specs || {},
  notes: record.notes || '',
  _production: {
    scopeId: record.id,
    revision: Number(record.revision || 0),
  },
});

/**
 * Converts the normalized production dataset back into the current nested
 * project records used by the stabilized prototype UI. Archived normalized
 * records remain available for audit/history but are excluded from active
 * operator, Book, meeting, and Wallboard projections.
 *
 * Private `_production` metadata travels with the compatibility record so the
 * existing New Project/Open File editor can retain stable normalized IDs and
 * detect stale edits without displaying a second entry interface.
 */
export const convertProductionToLegacyProjects = (dataset = {}) => {
  const customers = new Map((dataset.customers || []).map((item) => [item.id, item]));
  const leads = new Map((dataset.leads || []).map((item) => [item.id, item]));
  const teamMembers = new Map((dataset.teamMembers || []).map((item) => [item.id, item]));

  const scopesByJob = new Map();
  (dataset.workScopes || []).filter(isActiveRecord).forEach((scope) => {
    const list = scopesByJob.get(scope.jobId) || [];
    list.push(scope);
    scopesByJob.set(scope.jobId, list);
  });

  const changeOrdersByJob = new Map();
  (dataset.changeOrders || [])
    .filter((record) => isActiveRecord(record) && !['rejected', 'void'].includes(record.status))
    .forEach((record) => {
      const list = changeOrdersByJob.get(record.jobId) || [];
      list.push(record);
      changeOrdersByJob.set(record.jobId, list);
    });

  const projects = (dataset.jobs || []).filter(isActiveRecord).map((job) => {
    const customer = customers.get(job.customerId) || {};
    const lead = leads.get(job.leadId) || {};
    const salesperson = teamMembers.get(job.salespersonId) || {};
    const scopes = (scopesByJob.get(job.id) || []).map(toLegacyScope);
    const changeOrders = (changeOrdersByJob.get(job.id) || []).map(toLegacyChangeOrder);
    const collected = isCollected(job);

    return {
      id: legacyRecordId(job, 'JOB', ['legacyProjectId']),
      customer: customer.displayName || job.locationName || job.id,
      city: job.locationName || customer.address?.city || '',
      region: job.region || customer.address?.state || '',
      phone: customer.phone || '',
      dateSold: job.soldDate || '',
      salesperson: salesperson.displayName || '',
      leadSource: lead.source || '',
      paymentType: job.paymentType || '',
      originalAmount: Number(job.originalContractAmount || 0),
      deposit: Number(job.depositAmount || 0),
      collected,
      thankYouSent: Boolean(job.thankYouSent),
      cancelled: Boolean(job.cancelledAt || job.productionStage === PRODUCTION_STAGE.CANCELLED),
      cancellationDate: job.cancelledAt ? String(job.cancelledAt).slice(0, 10) : '',
      cancellationReason: job.cancellationReason || '',
      changeOrders,
      intake: {
        contractReceived: Boolean(job.intake?.contractReceived),
        uploadedJN: Boolean(job.intake?.documentsUploaded),
        estimateApproved: Boolean(job.intake?.estimateApproved),
        budgetCreated: Boolean(job.intake?.budgetCreated),
        invoiceCreated: Boolean(job.intake?.invoiceCreated),
        fileCreated: Boolean(job.intake?.fileCreated),
      },
      permits: {
        required: Boolean(job.permit?.required),
        type: job.permit?.type || '',
        submittedDate: job.permit?.submittedAt ? String(job.permit.submittedAt).slice(0, 10) : '',
        approvedDate: job.permit?.approvedAt ? String(job.permit.approvedAt).slice(0, 10) : '',
        notes: job.permit?.notes || '',
      },
      notes: job.notes || customer.notes || '',
      decisionNeeded: job.decisionNeeded || '',
      scopes,
      _production: {
        jobId: job.id,
        jobRevision: Number(job.revision || 0),
        customerId: customer.id || '',
        customerRevision: Number(customer.revision || 0),
        leadId: lead.id || '',
        leadRevision: Number(lead.revision || 0),
      },
    };
  });

  return normalizeLegacyProjects(
    projects.sort((a, b) => String(a.dateSold).localeCompare(String(b.dateSold))),
  );
};
