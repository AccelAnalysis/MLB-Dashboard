import {
  createActivityLog,
  createChangeOrder,
  createCustomer,
  createJob,
  createLead,
  createStatusEvent,
  createWorkScope,
} from '../domain/entityFactories';
import {
  calculateManualEntryFinancials,
  createManualEntryDraftFromDataset,
  specsTextToObject,
  summarizeManualEntryJobs,
  validateManualEntryDraft,
} from '../domain/manualEntry';
import {
  CHANGE_ORDER_STATUS,
  LEAD_STATUS,
  PRODUCTION_STAGE,
  RECORD_STATUS,
} from '../domain/enums';
import { convertProductionToLegacyProjects } from '../domain/productionToLegacy';
import { validateProductionDataset } from '../domain/validation';
import { BackendError, normalizeBackendError } from './backendErrors';
import { saveProjects } from './projectStorage';
import { getProductionRepository } from './productionRepository';

const nowIso = () => new Date().toISOString();
const dateTime = (value) => (value ? `${String(value).slice(0, 10)}T12:00:00.000Z` : '');
const cleanText = (value) => String(value || '').trim();
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const replaceRecord = (records, record) => {
  const exists = records.some((item) => item.id === record.id);
  return exists
    ? records.map((item) => (item.id === record.id ? record : item))
    : [...records, record];
};

const touchRecord = (record, patch, actorUserId) => ({
  ...record,
  ...patch,
  updatedAt: nowIso(),
  updatedBy: actorUserId || '',
  revision: Math.max(1, Number(record.revision) || 1) + 1,
});

const getPermissions = (capabilities = {}) => ({
  canCreate: Boolean(capabilities.createProjects),
  canEditSales: Boolean(capabilities.manageSalesData || capabilities.manageBusinessData),
  canEditProduction: Boolean(capabilities.manageProductionData || capabilities.manageBusinessData),
  canEditFinancial: Boolean(capabilities.manageFinancialData || capabilities.manageBusinessData),
});

export const canUseManualEntry = (capabilities = {}) => {
  const permissions = getPermissions(capabilities);
  return permissions.canCreate
    || permissions.canEditSales
    || permissions.canEditProduction
    || permissions.canEditFinancial;
};

export const loadManualEntryWorkspace = async () => {
  const repository = getProductionRepository();
  try {
    const { dataset, validation } = await repository.loadDataset();
    return {
      provider: repository.provider,
      dataset,
      validation,
      jobs: summarizeManualEntryJobs(dataset),
      teamMembers: (dataset.teamMembers || []).filter((member) => member.active),
      crews: (dataset.crews || []).filter((crew) => crew.active),
    };
  } catch (error) {
    throw normalizeBackendError(error, {
      code: 'MANUAL_ENTRY_LOAD_FAILED',
      operation: 'loadManualEntryWorkspace',
      provider: repository.provider,
      fallbackMessage: 'Unable to load the Critical Path entry workspace.',
    });
  }
};

export const getManualEntryDraft = (dataset, jobId, profile = null) => (
  jobId ? createManualEntryDraftFromDataset(dataset, jobId) : null
);

const assertRevision = (label, currentRecord, expectedRevision) => {
  if (!currentRecord) throw new BackendError(`${label} no longer exists. Refresh the workspace and try again.`, {
    code: 'MANUAL_ENTRY_RECORD_MISSING',
    operation: 'saveManualEntry',
    recoverable: true,
  });
  if (Number(expectedRevision || 0) !== Number(currentRecord.revision || 0)) {
    throw new BackendError(`${label} changed after this form was opened. Refresh before saving so another user's work is not overwritten.`, {
      code: 'MANUAL_ENTRY_REVISION_CONFLICT',
      operation: 'saveManualEntry',
      recoverable: true,
      details: { recordId: currentRecord.id, expectedRevision, currentRevision: currentRecord.revision },
    });
  }
};

const buildJobFinancialPatch = (draft) => {
  const financials = calculateManualEntryFinancials(draft);
  return {
    paymentStatus: draft.job.paymentStatus,
    paymentType: cleanText(draft.job.paymentType),
    financingProvider: cleanText(draft.job.financingProvider),
    originalContractAmount: financials.originalAmount,
    finalAmount: financials.effectiveFinalAmount,
    depositAmount: Number(draft.job.depositAmount || 0),
    amountPaid: financials.amountPaid,
    balanceDue: financials.balanceDue,
    fundedAt: dateTime(draft.job.fundedAt),
    collectedAt: dateTime(draft.job.collectedAt),
    closedAt: dateTime(draft.job.closedAt),
    cancelledAt: dateTime(draft.job.cancelledAt),
    cancellationReason: cleanText(draft.job.cancellationReason),
    thankYouSent: Boolean(draft.job.thankYouSent),
  };
};

const buildJobSalesPatch = (draft) => ({
  salespersonId: cleanText(draft.job.salespersonId),
  region: cleanText(draft.job.region),
  locationName: cleanText(draft.job.locationName || draft.customer.address?.city),
  soldDate: cleanText(draft.job.soldDate),
});

const buildJobProductionPatch = (draft) => ({
  productionStage: draft.job.productionStage,
  decisionNeeded: cleanText(draft.job.decisionNeeded),
  notes: cleanText(draft.job.notes),
  intake: { ...draft.job.intake },
  permit: {
    ...draft.job.permit,
    submittedAt: dateTime(draft.job.permit?.submittedAt),
    approvedAt: dateTime(draft.job.permit?.approvedAt),
  },
});

const createScopeRecord = (scope, jobId, actorUserId) => createWorkScope({
  jobId,
  category: scope.category,
  description: scope.description,
  productionStage: scope.productionStage,
  priority: scope.priority,
  measurerId: scope.measurerId,
  measurerName: scope.measurerName,
  crewId: scope.crewId,
  crewName: scope.crewName,
  vendor: scope.vendor,
  dates: { ...scope.dates },
  specs: specsTextToObject(scope.specsText),
  notes: scope.notes,
  createdBy: actorUserId,
  updatedBy: actorUserId,
});

const createChangeOrderRecord = (record, jobId, actorUserId) => createChangeOrder({
  jobId,
  workScopeId: record.workScopeId,
  status: record.removed ? CHANGE_ORDER_STATUS.VOID : record.status,
  requestedAt: dateTime(record.requestedAt),
  approvedAt: dateTime(record.approvedAt),
  description: record.description,
  reason: record.reason,
  amount: Number(record.amount || 0),
  customerApproved: record.customerApproved,
  approvedBy: record.approvedBy,
  createdBy: actorUserId,
  updatedBy: actorUserId,
});

const addStatusEvent = (dataset, input, actorUserId) => {
  const event = createStatusEvent({
    ...input,
    actorUserId,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
  dataset.statusEvents = [...dataset.statusEvents, event];
};

const refreshLegacyCompatibilityCache = (dataset) => {
  const projects = convertProductionToLegacyProjects(dataset);
  saveProjects(projects, { force: true });
  window.dispatchEvent(new CustomEvent('mlb-production-manual-entry-saved', {
    detail: { jobCount: dataset.jobs.length, savedAt: nowIso() },
  }));
  return projects;
};

export const saveManualEntryDraft = async ({ draft, profile, capabilities }) => {
  const permissions = getPermissions(capabilities);
  const isNew = draft.mode === 'new';
  const validation = validateManualEntryDraft(draft, { isNew, canCreate: permissions.canCreate });
  if (!validation.valid) {
    throw new BackendError('The Critical Path record contains validation errors.', {
      code: 'MANUAL_ENTRY_VALIDATION_FAILED',
      operation: 'saveManualEntry',
      recoverable: true,
      details: validation,
    });
  }

  if (!isNew && !permissions.canEditSales && !permissions.canEditProduction && !permissions.canEditFinancial) {
    throw new BackendError('Your role has read-only access to Critical Path records.', {
      code: 'MANUAL_ENTRY_READ_ONLY',
      operation: 'saveManualEntry',
      recoverable: false,
    });
  }

  const repository = getProductionRepository();
  const actorUserId = profile?.id || '';

  try {
    const { dataset: currentDataset } = await repository.loadDataset();
    const next = {
      ...currentDataset,
      customers: [...currentDataset.customers],
      leads: [...currentDataset.leads],
      jobs: [...currentDataset.jobs],
      workScopes: [...currentDataset.workScopes],
      changeOrders: [...currentDataset.changeOrders],
      statusEvents: [...currentDataset.statusEvents],
      activityLogs: [...currentDataset.activityLogs],
    };
    const changedCollections = new Set();
    const changedFields = [];
    let jobId = draft.ids.jobId;
    let beforeSummary = null;

    if (isNew) {
      if (!permissions.canCreate || !permissions.canEditSales || !permissions.canEditProduction || !permissions.canEditFinancial) {
        throw new BackendError('Creating a complete sold job requires sales, production, and financial entry authority.', {
          code: 'MANUAL_ENTRY_CREATE_PERMISSION_REQUIRED',
          operation: 'saveManualEntry',
          recoverable: false,
        });
      }

      const customer = createCustomer({
        ...draft.customer,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      });
      const lead = createLead({
        ...draft.lead,
        customerId: customer.id,
        assignedSalespersonId: draft.job.salespersonId || draft.lead.assignedSalespersonId,
        receivedAt: dateTime(draft.lead.receivedAt),
        status: LEAD_STATUS.SOLD,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      });
      const job = {
        ...createJob({
          ...buildJobSalesPatch(draft),
          ...buildJobProductionPatch(draft),
          ...buildJobFinancialPatch(draft),
          customerId: customer.id,
          leadId: lead.id,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        }),
        thankYouSent: Boolean(draft.job.thankYouSent),
      };
      jobId = job.id;

      next.customers.push(customer);
      next.leads.push(lead);
      next.jobs.push(job);
      changedCollections.add('customers');
      changedCollections.add('leads');
      changedCollections.add('jobs');
      changedFields.push('customer', 'lead', 'job');

      draft.scopes.filter((scope) => !scope.removed).forEach((scope) => {
        const created = createScopeRecord(scope, job.id, actorUserId);
        next.workScopes.push(created);
        addStatusEvent(next, {
          entityType: 'work_scope',
          entityId: created.id,
          fromStatus: '',
          toStatus: created.productionStage,
          note: 'Work scope created through manual Critical Path entry.',
          metadata: { jobId: job.id },
        }, actorUserId);
      });
      changedCollections.add('workScopes');

      draft.changeOrders.filter((record) => !record.removed).forEach((record) => {
        next.changeOrders.push(createChangeOrderRecord(record, job.id, actorUserId));
      });
      if (draft.changeOrders.some((record) => !record.removed)) changedCollections.add('changeOrders');

      addStatusEvent(next, {
        entityType: 'job',
        entityId: job.id,
        fromStatus: '',
        toStatus: job.productionStage,
        note: 'Sold job created through manual Critical Path entry.',
        metadata: { customerId: customer.id, leadId: lead.id },
      }, actorUserId);
      beforeSummary = null;
    } else {
      const currentJob = currentDataset.jobs.find((record) => record.id === draft.ids.jobId);
      const currentCustomer = currentDataset.customers.find((record) => record.id === draft.ids.customerId);
      const currentLead = currentDataset.leads.find((record) => record.id === draft.ids.leadId);
      assertRevision('Job', currentJob, draft.revisions.job);
      beforeSummary = {
        job: currentJob,
        customer: currentCustomer,
        lead: currentLead,
        scopes: currentDataset.workScopes.filter((record) => record.jobId === currentJob.id),
        changeOrders: currentDataset.changeOrders.filter((record) => record.jobId === currentJob.id),
      };

      if (permissions.canEditSales) {
        assertRevision('Customer', currentCustomer, draft.revisions.customer);
        if (currentLead) assertRevision('Lead', currentLead, draft.revisions.lead);

        const customerPatch = {
          ...draft.customer,
          email: cleanText(draft.customer.email).toLowerCase(),
          address: { ...draft.customer.address },
        };
        if (!same(customerPatch, {
          displayName: currentCustomer.displayName,
          firstName: currentCustomer.firstName,
          lastName: currentCustomer.lastName,
          companyName: currentCustomer.companyName,
          phone: currentCustomer.phone,
          alternatePhone: currentCustomer.alternatePhone,
          email: currentCustomer.email,
          preferredContactMethod: currentCustomer.preferredContactMethod,
          address: currentCustomer.address,
          notes: currentCustomer.notes,
        })) {
          next.customers = replaceRecord(next.customers, touchRecord(currentCustomer, customerPatch, actorUserId));
          changedCollections.add('customers');
          changedFields.push('customer');
        }

        if (currentLead) {
          const leadPatch = {
            assignedSalespersonId: draft.job.salespersonId || draft.lead.assignedSalespersonId,
            source: cleanText(draft.lead.source),
            campaign: cleanText(draft.lead.campaign),
            receivedAt: dateTime(draft.lead.receivedAt),
            status: draft.lead.status,
            notes: cleanText(draft.lead.notes),
          };
          const comparableLead = {
            assignedSalespersonId: currentLead.assignedSalespersonId,
            source: currentLead.source,
            campaign: currentLead.campaign,
            receivedAt: currentLead.receivedAt,
            status: currentLead.status,
            notes: currentLead.notes,
          };
          if (!same(leadPatch, comparableLead)) {
            next.leads = replaceRecord(next.leads, touchRecord(currentLead, leadPatch, actorUserId));
            changedCollections.add('leads');
            changedFields.push('lead');
          }
        }
      }

      let jobPatch = {};
      if (permissions.canEditSales) jobPatch = { ...jobPatch, ...buildJobSalesPatch(draft) };
      if (permissions.canEditProduction) jobPatch = { ...jobPatch, ...buildJobProductionPatch(draft) };
      if (permissions.canEditFinancial) jobPatch = { ...jobPatch, ...buildJobFinancialPatch(draft) };
      const comparableJob = Object.fromEntries(Object.keys(jobPatch).map((key) => [key, currentJob[key]]));
      if (!same(jobPatch, comparableJob)) {
        const updatedJob = touchRecord(currentJob, jobPatch, actorUserId);
        next.jobs = replaceRecord(next.jobs, updatedJob);
        changedCollections.add('jobs');
        changedFields.push('job');
        if (currentJob.productionStage !== updatedJob.productionStage) {
          addStatusEvent(next, {
            entityType: 'job',
            entityId: currentJob.id,
            fromStatus: currentJob.productionStage,
            toStatus: updatedJob.productionStage,
            note: 'Job production stage updated through Critical Path entry.',
          }, actorUserId);
        }
        if (currentJob.paymentStatus !== updatedJob.paymentStatus) {
          addStatusEvent(next, {
            entityType: 'job_payment',
            entityId: currentJob.id,
            fromStatus: currentJob.paymentStatus,
            toStatus: updatedJob.paymentStatus,
            note: 'Job payment status updated through Critical Path entry.',
          }, actorUserId);
        }
      }

      if (permissions.canEditProduction) {
        draft.scopes.forEach((scope) => {
          if (scope.existing) {
            const currentScope = currentDataset.workScopes.find((record) => record.id === scope.id);
            assertRevision(`Work scope ${scope.category || scope.id}`, currentScope, scope.revision);
            const scopePatch = scope.removed
              ? { recordStatus: RECORD_STATUS.ARCHIVED }
              : {
                  recordStatus: RECORD_STATUS.ACTIVE,
                  category: cleanText(scope.category),
                  description: cleanText(scope.description),
                  productionStage: scope.productionStage,
                  priority: cleanText(scope.priority || 'normal'),
                  measurerId: cleanText(scope.measurerId),
                  measurerName: cleanText(scope.measurerName),
                  crewId: cleanText(scope.crewId),
                  crewName: cleanText(scope.crewName),
                  vendor: cleanText(scope.vendor),
                  dates: { ...scope.dates },
                  specs: specsTextToObject(scope.specsText),
                  notes: cleanText(scope.notes),
                };
            const comparable = Object.fromEntries(Object.keys(scopePatch).map((key) => [key, currentScope[key]]));
            if (!same(scopePatch, comparable)) {
              const updatedScope = touchRecord(currentScope, scopePatch, actorUserId);
              next.workScopes = replaceRecord(next.workScopes, updatedScope);
              changedCollections.add('workScopes');
              changedFields.push(`scope:${scope.id}`);
              if (!scope.removed && currentScope.productionStage !== updatedScope.productionStage) {
                addStatusEvent(next, {
                  entityType: 'work_scope',
                  entityId: currentScope.id,
                  fromStatus: currentScope.productionStage,
                  toStatus: updatedScope.productionStage,
                  note: 'Work scope stage updated through Critical Path entry.',
                  metadata: { jobId: currentJob.id },
                }, actorUserId);
              }
            }
          } else if (!scope.removed) {
            const created = createScopeRecord(scope, currentJob.id, actorUserId);
            next.workScopes.push(created);
            changedCollections.add('workScopes');
            changedFields.push(`scope:${created.id}`);
            addStatusEvent(next, {
              entityType: 'work_scope',
              entityId: created.id,
              fromStatus: '',
              toStatus: created.productionStage,
              note: 'Work scope added through Critical Path entry.',
              metadata: { jobId: currentJob.id },
            }, actorUserId);
          }
        });
      }

      if (permissions.canEditFinancial) {
        draft.changeOrders.forEach((record) => {
          if (record.existing) {
            const currentOrder = currentDataset.changeOrders.find((item) => item.id === record.id);
            assertRevision(`Change order ${record.description || record.id}`, currentOrder, record.revision);
            const patch = {
              workScopeId: cleanText(record.workScopeId),
              status: record.removed ? CHANGE_ORDER_STATUS.VOID : record.status,
              requestedAt: dateTime(record.requestedAt),
              approvedAt: dateTime(record.approvedAt),
              description: cleanText(record.description),
              reason: cleanText(record.reason),
              amount: Number(record.amount || 0),
              customerApproved: Boolean(record.customerApproved),
              approvedBy: cleanText(record.approvedBy),
            };
            const comparable = Object.fromEntries(Object.keys(patch).map((key) => [key, currentOrder[key]]));
            if (!same(patch, comparable)) {
              next.changeOrders = replaceRecord(next.changeOrders, touchRecord(currentOrder, patch, actorUserId));
              changedCollections.add('changeOrders');
              changedFields.push(`changeOrder:${record.id}`);
            }
          } else if (!record.removed) {
            const created = createChangeOrderRecord(record, currentJob.id, actorUserId);
            next.changeOrders.push(created);
            changedCollections.add('changeOrders');
            changedFields.push(`changeOrder:${created.id}`);
          }
        });
      }
    }

    if (!changedFields.length) {
      return {
        saved: false,
        reason: 'NO_CHANGES',
        jobId,
        validation,
        dataset: currentDataset,
        jobs: summarizeManualEntryJobs(currentDataset),
      };
    }

    const currentJobAfter = next.jobs.find((record) => record.id === jobId);
    const activity = createActivityLog({
      actorUserId,
      action: isNew ? 'manual_critical_path_created' : 'manual_critical_path_updated',
      entityType: 'job',
      entityId: jobId,
      reason: isNew ? 'New sold job entered through Phase 6 manual entry.' : 'Critical Path record maintained through Phase 6 manual entry.',
      changedFields,
      before: beforeSummary,
      after: {
        job: currentJobAfter,
        customer: next.customers.find((record) => record.id === currentJobAfter.customerId),
        scopes: next.workScopes.filter((record) => record.jobId === jobId),
        changeOrders: next.changeOrders.filter((record) => record.jobId === jobId),
      },
      context: { provider: repository.provider, source: 'manual_entry_workspace' },
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
    next.activityLogs.push(activity);
    changedCollections.add('activityLogs');
    if (next.statusEvents.length !== currentDataset.statusEvents.length) changedCollections.add('statusEvents');

    const datasetValidation = validateProductionDataset(next);
    if (!datasetValidation.valid) {
      throw new BackendError('The normalized dataset failed validation before save.', {
        code: 'MANUAL_ENTRY_DATASET_INVALID',
        operation: 'saveManualEntry',
        recoverable: true,
        details: datasetValidation,
      });
    }

    const collections = [...changedCollections];
    const result = await repository.saveDataset(next, { collections, syncState: 'synced' });
    const legacyProjects = refreshLegacyCompatibilityCache(next);

    return {
      saved: true,
      jobId,
      validation,
      datasetValidation,
      result,
      collections,
      dataset: next,
      jobs: summarizeManualEntryJobs(next),
      legacyProjects,
    };
  } catch (error) {
    if (error instanceof BackendError) throw error;
    throw normalizeBackendError(error, {
      code: 'MANUAL_ENTRY_SAVE_FAILED',
      operation: 'saveManualEntry',
      provider: repository.provider,
      fallbackMessage: 'Unable to save the Critical Path record.',
    });
  }
};
