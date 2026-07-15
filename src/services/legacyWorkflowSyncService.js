import {
  createActivityLog,
  createStatusEvent,
} from '../domain/entityFactories';
import {
  CHANGE_ORDER_STATUS,
  DATA_SOURCE,
  RECORD_STATUS,
  SYNC_STATE,
} from '../domain/enums';
import { convertLegacyProjectsToProduction } from '../domain/legacyToProduction';
import { normalizeLegacyProjects } from '../domain/legacyProjectAdapter';
import { convertProductionToLegacyProjects } from '../domain/productionToLegacy';
import { validateProductionDataset } from '../domain/validation';
import { BackendError, normalizeBackendError } from './backendErrors';
import { saveProjects } from './projectStorage';
import { getProductionRepository } from './productionRepository';

const CORE_COLLECTIONS = [
  'customers',
  'leads',
  'jobs',
  'workScopes',
  'changeOrders',
  'teamMembers',
  'crews',
];

const nowIso = () => new Date().toISOString();
const clean = (value) => String(value || '').trim();
const normalizeName = (value) => clean(value).toLowerCase().replace(/\s+/g, ' ');

const stableSerialize = (value) => {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
};

const same = (left, right) => stableSerialize(left) === stableSerialize(right);

const stripLegacyPrefix = (value, prefix) => {
  const text = clean(value);
  const marker = `${prefix}-LEGACY-`;
  return text.startsWith(marker) ? text.slice(marker.length) : text;
};

const legacyKey = (record, prefix) => {
  const externalId = record?.externalIds?.legacyDashboard;
  if (externalId) return stripLegacyPrefix(externalId, prefix);
  return stripLegacyPrefix(record?.id, prefix);
};

const findByLegacyIdentity = (records, incoming, prefix, preferredId = '') => {
  if (preferredId) {
    const preferred = records.find((record) => record.id === preferredId);
    if (preferred) return preferred;
  }

  const exact = records.find((record) => record.id === incoming?.id);
  if (exact) return exact;

  const key = legacyKey(incoming, prefix);
  return records.find((record) => record.id === key || legacyKey(record, prefix) === key) || null;
};

const mergeExternalIds = (current, incoming) => ({
  ...(current?.externalIds || {}),
  ...(incoming?.externalIds || {}),
});

const applyPatch = ({ current, incoming, patch, actorUserId }) => {
  if (!current) {
    const timestamp = nowIso();
    return {
      record: {
        ...incoming,
        ...patch,
        sourceSystem: DATA_SOURCE.DASHBOARD,
        syncState: SYNC_STATE.LOCAL_ONLY,
        externalIds: mergeExternalIds(null, incoming),
        createdAt: incoming?.createdAt || timestamp,
        createdBy: actorUserId || incoming?.createdBy || '',
        updatedAt: timestamp,
        updatedBy: actorUserId,
        revision: Math.max(1, Number(incoming?.revision) || 1),
      },
      changed: true,
      created: true,
      changedFields: Object.keys(patch),
    };
  }

  const externalIds = mergeExternalIds(current, incoming);
  const changedFields = Object.keys(patch).filter((key) => !same(current[key], patch[key]));
  if (!same(current.externalIds || {}, externalIds)) changedFields.push('externalIds');

  if (!changedFields.length) {
    return { record: current, changed: false, created: false, changedFields: [] };
  }

  return {
    record: {
      ...current,
      ...patch,
      externalIds,
      syncState: SYNC_STATE.LOCAL_ONLY,
      updatedAt: nowIso(),
      updatedBy: actorUserId,
      revision: Math.max(1, Number(current.revision) || 1) + 1,
    },
    changed: true,
    created: false,
    changedFields,
  };
};

const assertRevision = ({ label, current, expectedRevision, checked }) => {
  if (!current || expectedRevision === undefined || expectedRevision === null || expectedRevision === '') return;
  const key = `${label}:${current.id}`;
  if (checked.has(key)) return;
  checked.add(key);

  if (Number(expectedRevision) !== Number(current.revision || 0)) {
    throw new BackendError(`${label} changed after the project file was opened. The latest backend record has been restored; reopen the file before editing again.`, {
      code: 'LEGACY_WORKFLOW_REVISION_CONFLICT',
      operation: 'syncLegacyWorkflow',
      recoverable: true,
      details: {
        recordId: current.id,
        expectedRevision,
        currentRevision: current.revision,
      },
    });
  }
};

const projectChanged = (previous, next) => !previous || !same(previous, next);

const inferCollectionChanges = (before, after) => CORE_COLLECTIONS.filter(
  (collection) => !same(before[collection] || [], after[collection] || []),
);

const dispatchCompatibilityRefresh = (dataset) => {
  const projects = convertProductionToLegacyProjects(dataset);
  saveProjects(projects, {
    force: true,
    skipProductionSync: true,
    source: 'normalized-production-refresh',
  });
  window.dispatchEvent(new CustomEvent('mlb-production-workflow-saved', {
    detail: { savedAt: nowIso(), jobCount: dataset.jobs.length },
  }));
  return projects;
};

const addStatusEvent = (next, input, actorUserId) => {
  next.statusEvents.push(createStatusEvent({
    ...input,
    actorUserId,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  }));
};

const addActivity = (next, input, actorUserId) => {
  next.activityLogs.push(createActivityLog({
    ...input,
    actorUserId,
    createdBy: actorUserId,
    updatedBy: actorUserId,
    context: {
      ...(input.context || {}),
      source: 'new_project_open_file',
    },
  }));
};

const copyDataset = (dataset) => ({
  ...dataset,
  customers: [...(dataset.customers || [])],
  leads: [...(dataset.leads || [])],
  jobs: [...(dataset.jobs || [])],
  workScopes: [...(dataset.workScopes || [])],
  changeOrders: [...(dataset.changeOrders || [])],
  teamMembers: [...(dataset.teamMembers || [])],
  crews: [...(dataset.crews || [])],
  statusEvents: [...(dataset.statusEvents || [])],
  activityLogs: [...(dataset.activityLogs || [])],
});

const replaceRecord = (records, record) => {
  const index = records.findIndex((item) => item.id === record.id);
  if (index === -1) return [...records, record];
  const next = [...records];
  next[index] = record;
  return next;
};

const scopeMetadataFor = (scope) => scope?._production || {};
const changeOrderMetadataFor = (record) => record?._production || {};

const findProjectRecord = (dataset, projectId, productionMetadata = {}) => {
  const preferredId = productionMetadata.jobId || '';
  const synthetic = {
    id: `JOB-LEGACY-${projectId}`,
    externalIds: { legacyDashboard: `JOB-LEGACY-${projectId}` },
  };
  return findByLegacyIdentity(dataset.jobs || [], synthetic, 'JOB', preferredId);
};

const findScopeRecord = (dataset, jobId, scope, metadata = {}) => {
  const candidates = (dataset.workScopes || []).filter((record) => record.jobId === jobId);
  const synthetic = {
    id: `SCP-LEGACY-${scope.id}`,
    externalIds: { legacyDashboard: `SCP-LEGACY-${scope.id}` },
  };
  return findByLegacyIdentity(candidates, synthetic, 'SCP', metadata.scopeId || '');
};

const findChangeOrderRecord = (dataset, jobId, changeOrder, metadata = {}) => {
  const candidates = (dataset.changeOrders || []).filter((record) => record.jobId === jobId);
  const synthetic = {
    id: `CO-LEGACY-${changeOrder.id}`,
    externalIds: { legacyDashboard: `CO-LEGACY-${changeOrder.id}` },
  };
  return findByLegacyIdentity(candidates, synthetic, 'CO', metadata.changeOrderId || '');
};

const active = (record) => record?.recordStatus !== RECORD_STATUS.ARCHIVED;

const rollbackCompatibilityCache = (dataset, previousProjects = []) => {
  try {
    if (dataset) {
      dispatchCompatibilityRefresh(dataset);
      return;
    }
    saveProjects(previousProjects, {
      force: true,
      skipProductionSync: true,
      source: 'normalized-production-rollback',
    });
  } catch {
    // The original sync error is more useful than a secondary rollback error.
  }
};

export const initializeLegacyWorkflowProduction = async ({ projects = [], profile = null } = {}) => {
  const repository = getProductionRepository();
  const normalizedProjects = normalizeLegacyProjects(projects);
  const actorUserId = profile?.id || '';

  try {
    const { dataset } = await repository.loadDataset();
    if ((dataset.jobs || []).length || !normalizedProjects.length) {
      if ((dataset.jobs || []).length) dispatchCompatibilityRefresh(dataset);
      return { initialized: true, imported: false, dataset };
    }

    const conversion = convertLegacyProjectsToProduction(normalizedProjects);
    if (!conversion.validation.valid) {
      throw new BackendError('The existing project records could not initialize the normalized production backend.', {
        code: 'LEGACY_WORKFLOW_BOOTSTRAP_INVALID',
        operation: 'initializeLegacyWorkflowProduction',
        recoverable: true,
        details: conversion.validation,
      });
    }

    const next = {
      ...conversion.dataset,
      activityLogs: [
        ...(conversion.dataset.activityLogs || []),
        createActivityLog({
          actorUserId,
          action: 'legacy_workflow_bootstrap',
          entityType: 'production_dataset',
          entityId: 'production-dataset',
          reason: 'Initialized normalized production records behind the New Project and Open File workflow.',
          changedFields: CORE_COLLECTIONS,
          context: { source: 'new_project_open_file' },
          createdBy: actorUserId,
          updatedBy: actorUserId,
        }),
      ],
    };

    await repository.saveDataset(next, {
      collections: [...CORE_COLLECTIONS, 'activityLogs'],
      syncState: 'synced',
    });
    dispatchCompatibilityRefresh(next);
    return { initialized: true, imported: true, dataset: next };
  } catch (error) {
    throw normalizeBackendError(error, {
      code: 'LEGACY_WORKFLOW_INITIALIZATION_FAILED',
      operation: 'initializeLegacyWorkflowProduction',
      provider: repository.provider,
      fallbackMessage: 'Unable to initialize the production backend for the project-file workflow.',
    });
  }
};

export const syncLegacyProjectsToProduction = async ({
  projects = [],
  previousProjects = [],
  profile = null,
  capabilities = {},
} = {}) => {
  const repository = getProductionRepository();
  const actorUserId = profile?.id || '';
  const canWrite = Boolean(
    capabilities.createProjects
    || capabilities.manageSalesData
    || capabilities.manageProductionData
    || capabilities.manageFinancialData
    || capabilities.manageBusinessData,
  );

  if (!canWrite) {
    throw new BackendError('Your role cannot update production records.', {
      code: 'LEGACY_WORKFLOW_READ_ONLY',
      operation: 'syncLegacyWorkflow',
      recoverable: false,
    });
  }

  const normalizedProjects = normalizeLegacyProjects(projects);
  const normalizedPrevious = normalizeLegacyProjects(previousProjects);
  const previousById = new Map(normalizedPrevious.map((project) => [String(project.id), project]));
  const nextById = new Map(normalizedProjects.map((project) => [String(project.id), project]));
  const changedProjectIds = new Set(
    normalizedProjects
      .filter((project) => projectChanged(previousById.get(String(project.id)), project))
      .map((project) => String(project.id)),
  );
  const deletedProjectIds = normalizedPrevious
    .filter((project) => !nextById.has(String(project.id)))
    .map((project) => String(project.id));

  if (!changedProjectIds.size && !deletedProjectIds.length) {
    return { saved: false, reason: 'NO_CHANGES' };
  }

  let currentDataset = null;

  try {
    const loaded = await repository.loadDataset();
    currentDataset = loaded.dataset;
    const conversion = convertLegacyProjectsToProduction(normalizedProjects);
    if (!conversion.validation.valid) {
      throw new BackendError('The project file contains data that cannot be saved to the normalized production backend.', {
        code: 'LEGACY_WORKFLOW_VALIDATION_FAILED',
        operation: 'syncLegacyWorkflow',
        recoverable: true,
        details: conversion.validation,
      });
    }

    const incoming = conversion.dataset;
    const next = copyDataset(currentDataset);
    const original = copyDataset(currentDataset);
    const checkedRevisions = new Set();
    const teamMemberIdMap = new Map();
    const crewIdMap = new Map();
    const customerIdMap = new Map();
    const leadIdMap = new Map();

    incoming.teamMembers.forEach((member) => {
      const current = findByLegacyIdentity(
        next.teamMembers,
        member,
        'TMB-SALES',
      ) || next.teamMembers.find((record) => normalizeName(record.displayName) === normalizeName(member.displayName));
      const patch = current
        ? {
            salesperson: Boolean(current.salesperson || member.salesperson),
            active: true,
            regionAssignments: [...new Set([...(current.regionAssignments || []), ...(member.regionAssignments || [])])],
          }
        : member;
      const result = applyPatch({ current, incoming: member, patch, actorUserId });
      next.teamMembers = replaceRecord(next.teamMembers, result.record);
      teamMemberIdMap.set(member.id, result.record.id);
    });

    incoming.crews.forEach((crew) => {
      const current = findByLegacyIdentity(next.crews, crew, 'CRW')
        || next.crews.find((record) => normalizeName(record.name) === normalizeName(crew.name));
      const patch = current
        ? {
            active: true,
            tradeCategories: [...new Set([...(current.tradeCategories || []), ...(crew.tradeCategories || [])])],
          }
        : crew;
      const result = applyPatch({ current, incoming: crew, patch, actorUserId });
      next.crews = replaceRecord(next.crews, result.record);
      crewIdMap.set(crew.id, result.record.id);
    });

    for (const projectId of changedProjectIds) {
      const project = nextById.get(projectId);
      const previousProject = previousById.get(projectId) || null;
      const metadata = project?._production || {};
      const incomingJob = incoming.jobs.find((job) => legacyKey(job, 'JOB') === projectId);
      if (!incomingJob) continue;

      const currentJob = findProjectRecord(next, projectId, metadata);
      assertRevision({
        label: 'Project file',
        current: currentJob,
        expectedRevision: metadata.jobRevision,
        checked: checkedRevisions,
      });

      const incomingCustomer = incoming.customers.find((customer) => customer.id === incomingJob.customerId);
      let currentCustomer = null;
      if (customerIdMap.has(incomingCustomer?.id)) {
        currentCustomer = next.customers.find((record) => record.id === customerIdMap.get(incomingCustomer.id));
      } else {
        currentCustomer = next.customers.find((record) => record.id === (metadata.customerId || currentJob?.customerId))
          || findByLegacyIdentity(next.customers, incomingCustomer, 'CUS')
          || next.customers.find((record) => (
            normalizeName(record.displayName) === normalizeName(incomingCustomer?.displayName)
            && clean(record.phone) === clean(incomingCustomer?.phone)
          ));
      }
      assertRevision({
        label: 'Customer record',
        current: currentCustomer,
        expectedRevision: metadata.customerRevision,
        checked: checkedRevisions,
      });

      const customerPatch = {
        displayName: incomingCustomer?.displayName || project.customer,
        phone: incomingCustomer?.phone || project.phone,
        address: {
          ...(currentCustomer?.address || incomingCustomer?.address || {}),
          city: incomingCustomer?.address?.city || project.city || '',
          state: incomingCustomer?.address?.state || '',
        },
      };
      const customerResult = applyPatch({
        current: currentCustomer,
        incoming: incomingCustomer,
        patch: customerPatch,
        actorUserId,
      });
      next.customers = replaceRecord(next.customers, customerResult.record);
      customerIdMap.set(incomingCustomer.id, customerResult.record.id);

      const incomingLead = incoming.leads.find((lead) => lead.id === incomingJob.leadId) || null;
      let currentLead = null;
      if (incomingLead) {
        if (leadIdMap.has(incomingLead.id)) {
          currentLead = next.leads.find((record) => record.id === leadIdMap.get(incomingLead.id));
        } else {
          currentLead = next.leads.find((record) => record.id === (metadata.leadId || currentJob?.leadId))
            || findByLegacyIdentity(next.leads, incomingLead, 'LED');
        }
        assertRevision({
          label: 'Lead record',
          current: currentLead,
          expectedRevision: metadata.leadRevision,
          checked: checkedRevisions,
        });
      }

      let leadId = '';
      let leadResult = null;
      if (incomingLead) {
        const leadPatch = {
          customerId: customerResult.record.id,
          assignedSalespersonId: teamMemberIdMap.get(incomingLead.assignedSalespersonId) || currentLead?.assignedSalespersonId || '',
          source: incomingLead.source,
          receivedAt: incomingLead.receivedAt,
          dispositionedAt: incomingLead.dispositionedAt,
          status: incomingLead.status,
        };
        leadResult = applyPatch({ current: currentLead, incoming: incomingLead, patch: leadPatch, actorUserId });
        next.leads = replaceRecord(next.leads, leadResult.record);
        leadIdMap.set(incomingLead.id, leadResult.record.id);
        leadId = leadResult.record.id;
      }

      const completionDates = (project.scopes || []).map((scope) => scope.completionDate).filter(Boolean).sort();
      const closeoutDate = completionDates.at(-1) || new Date().toISOString().slice(0, 10);
      const salespersonId = teamMemberIdMap.get(incomingJob.salespersonId) || currentJob?.salespersonId || '';
      const collected = Boolean(project.collected);
      const jobPatch = {
        recordStatus: incomingJob.recordStatus,
        customerId: customerResult.record.id,
        leadId,
        salespersonId,
        region: incomingJob.region,
        locationName: incomingJob.locationName,
        soldDate: incomingJob.soldDate,
        productionStage: incomingJob.productionStage,
        paymentStatus: incomingJob.paymentStatus,
        paymentType: incomingJob.paymentType,
        originalContractAmount: incomingJob.originalContractAmount,
        finalAmount: incomingJob.finalAmount,
        depositAmount: incomingJob.depositAmount,
        amountPaid: collected ? incomingJob.finalAmount : incomingJob.depositAmount,
        balanceDue: collected ? 0 : Math.max(0, incomingJob.finalAmount - incomingJob.depositAmount),
        fundedAt: collected ? (currentJob?.fundedAt || closeoutDate) : '',
        collectedAt: collected ? (currentJob?.collectedAt || closeoutDate) : '',
        closedAt: collected && incomingJob.closedAt ? (currentJob?.closedAt || incomingJob.closedAt || closeoutDate) : '',
        cancelledAt: incomingJob.cancelledAt,
        cancellationReason: incomingJob.cancellationReason,
        decisionNeeded: incomingJob.decisionNeeded,
        notes: incomingJob.notes,
        thankYouSent: Boolean(project.thankYouSent),
        intake: incomingJob.intake,
        permit: incomingJob.permit,
      };
      const jobResult = applyPatch({ current: currentJob, incoming: incomingJob, patch: jobPatch, actorUserId });
      next.jobs = replaceRecord(next.jobs, jobResult.record);
      const persistedJob = jobResult.record;
      const jobChangeFields = new Set(jobResult.changedFields);

      if (jobResult.created) {
        addStatusEvent(next, {
          entityType: 'job',
          entityId: persistedJob.id,
          fromStatus: '',
          toStatus: persistedJob.productionStage,
          note: 'Project created through New Project.',
          metadata: { legacyProjectId: projectId },
        }, actorUserId);
      } else {
        if (currentJob.productionStage !== persistedJob.productionStage) {
          addStatusEvent(next, {
            entityType: 'job',
            entityId: persistedJob.id,
            fromStatus: currentJob.productionStage,
            toStatus: persistedJob.productionStage,
            note: 'Project stage updated through Open File.',
          }, actorUserId);
        }
        if (currentJob.paymentStatus !== persistedJob.paymentStatus) {
          addStatusEvent(next, {
            entityType: 'job_payment',
            entityId: persistedJob.id,
            fromStatus: currentJob.paymentStatus,
            toStatus: persistedJob.paymentStatus,
            note: 'Payment status updated through Open File.',
          }, actorUserId);
        }
      }

      const incomingScopes = incoming.workScopes.filter((scope) => scope.jobId === incomingJob.id);
      for (const legacyScope of project.scopes || []) {
        const incomingScope = incomingScopes.find((scope) => legacyKey(scope, 'SCP') === String(legacyScope.id));
        if (!incomingScope) continue;
        const scopeMetadata = scopeMetadataFor(legacyScope);
        const currentScope = findScopeRecord(next, persistedJob.id, legacyScope, scopeMetadata);
        assertRevision({
          label: `Work scope ${legacyScope.type || legacyScope.id}`,
          current: currentScope,
          expectedRevision: scopeMetadata.revision,
          checked: checkedRevisions,
        });

        const scopePatch = {
          recordStatus: incomingScope.recordStatus,
          jobId: persistedJob.id,
          category: incomingScope.category,
          productionStage: incomingScope.productionStage,
          measurerId: currentScope?.measurerName === incomingScope.measurerName ? currentScope.measurerId : '',
          measurerName: incomingScope.measurerName,
          crewId: crewIdMap.get(incomingScope.crewId) || currentScope?.crewId || '',
          crewName: incomingScope.crewName,
          vendor: incomingScope.vendor,
          dates: incomingScope.dates,
          specs: incomingScope.specs,
          notes: incomingScope.notes,
        };
        const scopeResult = applyPatch({ current: currentScope, incoming: incomingScope, patch: scopePatch, actorUserId });
        next.workScopes = replaceRecord(next.workScopes, scopeResult.record);
        scopeResult.changedFields.forEach((field) => jobChangeFields.add(`scope:${scopeResult.record.id}:${field}`));

        if (scopeResult.created || currentScope?.productionStage !== scopeResult.record.productionStage) {
          addStatusEvent(next, {
            entityType: 'work_scope',
            entityId: scopeResult.record.id,
            fromStatus: currentScope?.productionStage || '',
            toStatus: scopeResult.record.productionStage,
            note: scopeResult.created ? 'Work scope added through Open File.' : 'Work scope stage updated through Open File.',
            metadata: { jobId: persistedJob.id },
          }, actorUserId);
        }
      }

      if (previousProject) {
        const nextScopeIds = new Set((project.scopes || []).map((scope) => String(scope.id)));
        for (const removedScope of previousProject.scopes || []) {
          if (nextScopeIds.has(String(removedScope.id))) continue;
          const scopeMetadata = scopeMetadataFor(removedScope);
          const currentScope = findScopeRecord(next, persistedJob.id, removedScope, scopeMetadata);
          if (!currentScope || currentScope.recordStatus === RECORD_STATUS.ARCHIVED) continue;
          assertRevision({
            label: `Work scope ${removedScope.type || removedScope.id}`,
            current: currentScope,
            expectedRevision: scopeMetadata.revision,
            checked: checkedRevisions,
          });
          const result = applyPatch({
            current: currentScope,
            incoming: currentScope,
            patch: { recordStatus: RECORD_STATUS.ARCHIVED },
            actorUserId,
          });
          next.workScopes = replaceRecord(next.workScopes, result.record);
          jobChangeFields.add(`scope:${result.record.id}:recordStatus`);
          addStatusEvent(next, {
            entityType: 'work_scope',
            entityId: result.record.id,
            fromStatus: currentScope.productionStage,
            toStatus: RECORD_STATUS.ARCHIVED,
            note: 'Work scope archived through Open File.',
            metadata: { jobId: persistedJob.id },
          }, actorUserId);
        }
      }

      const incomingOrders = incoming.changeOrders.filter((record) => record.jobId === incomingJob.id);
      for (const legacyOrder of project.changeOrders || []) {
        const incomingOrder = incomingOrders.find((record) => legacyKey(record, 'CO') === String(legacyOrder.id));
        if (!incomingOrder) continue;
        const orderMetadata = changeOrderMetadataFor(legacyOrder);
        const currentOrder = findChangeOrderRecord(next, persistedJob.id, legacyOrder, orderMetadata);
        assertRevision({
          label: `Change order ${legacyOrder.description || legacyOrder.id}`,
          current: currentOrder,
          expectedRevision: orderMetadata.revision,
          checked: checkedRevisions,
        });
        const orderPatch = {
          recordStatus: RECORD_STATUS.ACTIVE,
          jobId: persistedJob.id,
          workScopeId: currentOrder?.workScopeId || '',
          status: CHANGE_ORDER_STATUS.APPROVED,
          requestedAt: incomingOrder.requestedAt,
          approvedAt: incomingOrder.approvedAt,
          description: incomingOrder.description,
          amount: incomingOrder.amount,
          customerApproved: true,
        };
        const orderResult = applyPatch({ current: currentOrder, incoming: incomingOrder, patch: orderPatch, actorUserId });
        next.changeOrders = replaceRecord(next.changeOrders, orderResult.record);
        orderResult.changedFields.forEach((field) => jobChangeFields.add(`changeOrder:${orderResult.record.id}:${field}`));
      }

      if (previousProject) {
        const nextOrderIds = new Set((project.changeOrders || []).map((record) => String(record.id)));
        for (const removedOrder of previousProject.changeOrders || []) {
          if (nextOrderIds.has(String(removedOrder.id))) continue;
          const orderMetadata = changeOrderMetadataFor(removedOrder);
          const currentOrder = findChangeOrderRecord(next, persistedJob.id, removedOrder, orderMetadata);
          if (!currentOrder || currentOrder.status === CHANGE_ORDER_STATUS.VOID) continue;
          assertRevision({
            label: `Change order ${removedOrder.description || removedOrder.id}`,
            current: currentOrder,
            expectedRevision: orderMetadata.revision,
            checked: checkedRevisions,
          });
          const result = applyPatch({
            current: currentOrder,
            incoming: currentOrder,
            patch: { status: CHANGE_ORDER_STATUS.VOID },
            actorUserId,
          });
          next.changeOrders = replaceRecord(next.changeOrders, result.record);
          jobChangeFields.add(`changeOrder:${result.record.id}:status`);
        }
      }

      if (customerResult.changed) customerResult.changedFields.forEach((field) => jobChangeFields.add(`customer:${field}`));
      if (leadResult?.changed) leadResult.changedFields.forEach((field) => jobChangeFields.add(`lead:${field}`));
      if (jobChangeFields.size) {
        addActivity(next, {
          action: jobResult.created ? 'project_created' : 'project_updated',
          entityType: 'job',
          entityId: persistedJob.id,
          reason: jobResult.created
            ? 'Project created through New Project.'
            : 'Project maintained through Open File and Edit Project.',
          changedFields: [...jobChangeFields],
          before: currentJob || null,
          after: persistedJob,
          context: { legacyProjectId: projectId },
        }, actorUserId);
      }
    }

    for (const projectId of deletedProjectIds) {
      const previousProject = previousById.get(projectId);
      const metadata = previousProject?._production || {};
      const currentJob = findProjectRecord(next, projectId, metadata);
      if (!currentJob || currentJob.recordStatus === RECORD_STATUS.ARCHIVED) continue;
      assertRevision({
        label: 'Project file',
        current: currentJob,
        expectedRevision: metadata.jobRevision,
        checked: checkedRevisions,
      });
      const jobResult = applyPatch({
        current: currentJob,
        incoming: currentJob,
        patch: { recordStatus: RECORD_STATUS.ARCHIVED },
        actorUserId,
      });
      next.jobs = replaceRecord(next.jobs, jobResult.record);

      next.workScopes
        .filter((scope) => scope.jobId === currentJob.id && active(scope))
        .forEach((scope) => {
          const result = applyPatch({
            current: scope,
            incoming: scope,
            patch: { recordStatus: RECORD_STATUS.ARCHIVED },
            actorUserId,
          });
          next.workScopes = replaceRecord(next.workScopes, result.record);
        });

      addStatusEvent(next, {
        entityType: 'job',
        entityId: currentJob.id,
        fromStatus: currentJob.productionStage,
        toStatus: RECORD_STATUS.ARCHIVED,
        note: 'Project removed from active use through the project-file workflow.',
        metadata: { legacyProjectId: projectId },
      }, actorUserId);
      addActivity(next, {
        action: 'project_archived',
        entityType: 'job',
        entityId: currentJob.id,
        reason: 'Project removed from the active dashboard; normalized history was retained.',
        changedFields: ['recordStatus'],
        before: currentJob,
        after: jobResult.record,
        context: { legacyProjectId: projectId },
      }, actorUserId);
    }

    const datasetValidation = validateProductionDataset(next);
    if (!datasetValidation.valid) {
      throw new BackendError('The normalized production dataset failed validation. The previous project data has been restored.', {
        code: 'LEGACY_WORKFLOW_DATASET_INVALID',
        operation: 'syncLegacyWorkflow',
        recoverable: true,
        details: datasetValidation,
      });
    }

    const changedCollections = inferCollectionChanges(original, next);
    if (next.statusEvents.length !== original.statusEvents.length) changedCollections.push('statusEvents');
    if (next.activityLogs.length !== original.activityLogs.length) changedCollections.push('activityLogs');
    const uniqueCollections = [...new Set(changedCollections)];

    if (!uniqueCollections.length) {
      dispatchCompatibilityRefresh(next);
      return { saved: false, reason: 'NO_NORMALIZED_CHANGES', dataset: next };
    }

    const result = await repository.saveDataset(next, {
      collections: uniqueCollections,
      syncState: 'synced',
    });
    const legacyProjects = dispatchCompatibilityRefresh(next);

    return {
      saved: true,
      result,
      dataset: next,
      collections: uniqueCollections,
      legacyProjects,
      validation: datasetValidation,
    };
  } catch (error) {
    rollbackCompatibilityCache(currentDataset, normalizedPrevious);
    if (error instanceof BackendError) throw error;
    throw normalizeBackendError(error, {
      code: 'LEGACY_WORKFLOW_SYNC_FAILED',
      operation: 'syncLegacyWorkflow',
      provider: repository.provider,
      fallbackMessage: 'Unable to save the project file to the normalized production backend.',
    });
  }
};
