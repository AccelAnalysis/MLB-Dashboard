import {
  DATA_SOURCE,
  LEAD_STATUS,
  PAYMENT_STATUS,
  PRODUCTION_STAGE,
  RECORD_STATUS,
  SYNC_STATE,
} from './enums';
import {
  createChangeOrder,
  createCrew,
  createCustomer,
  createJob,
  createLead,
  createTeamMember,
  createWorkScope,
} from './entityFactories';
import { createEmptyProductionDataset } from './productionDataset';
import { validateProductionDataset } from './validation';
import { normalizeLegacyProjects } from './legacyProjectAdapter';

const safeKey = (value) => String(value || 'unknown')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'unknown';

const legacyId = (prefix, value) => `${prefix}-LEGACY-${String(value || 'UNKNOWN').replace(/[^a-zA-Z0-9_-]/g, '-')}`;

const inferScopeStage = (scope, project) => {
  if (project.cancelled) return PRODUCTION_STAGE.CANCELLED;
  if (scope.completionDate) return project.collected ? PRODUCTION_STAGE.CLOSED : PRODUCTION_STAGE.COMPLETED;
  if (scope.startDate) return PRODUCTION_STAGE.IN_PROGRESS;
  if (scope.scheduledInstallDate) return PRODUCTION_STAGE.SCHEDULED;
  if (scope.materialsIn) return PRODUCTION_STAGE.MATERIALS_RECEIVED;
  if (scope.materialETA) return PRODUCTION_STAGE.WAITING_MATERIALS;
  if (scope.dateOrdered) return PRODUCTION_STAGE.MATERIALS_ORDERED;
  if (scope.materialListReceived) return PRODUCTION_STAGE.MATERIAL_LIST_RECEIVED;
  if (scope.measureCompleted) return PRODUCTION_STAGE.MEASURED;
  if (scope.measureRequested || scope.measurer) return PRODUCTION_STAGE.MEASURE_REQUESTED;
  return PRODUCTION_STAGE.SOLD;
};

const inferJobStage = (project) => {
  if (project.cancelled) return PRODUCTION_STAGE.CANCELLED;
  if (!project.scopes.length) return PRODUCTION_STAGE.SOLD;
  if (project.scopes.every((scope) => scope.completionDate)) {
    return project.collected ? PRODUCTION_STAGE.CLOSED : PRODUCTION_STAGE.FUNDING_PENDING;
  }
  const stageOrder = Object.values(PRODUCTION_STAGE);
  return project.scopes
    .map((scope) => inferScopeStage(scope, project))
    .sort((a, b) => stageOrder.indexOf(b) - stageOrder.indexOf(a))[0] || PRODUCTION_STAGE.SOLD;
};

const revisedAmount = (project) => Number(project.originalAmount || 0)
  + project.changeOrders.reduce((sum, item) => sum + Number(item.amount || 0), 0);

const metadata = (id) => ({
  id,
  sourceSystem: DATA_SOURCE.MANUAL_IMPORT,
  syncState: SYNC_STATE.IMPORTED,
  externalIds: { legacyDashboard: id },
});

/**
 * Converts the current nested localStorage model into the normalized Phase 3
 * production dataset. It does not mutate active dashboard records.
 */
export const convertLegacyProjectsToProduction = (inputProjects = []) => {
  const projects = normalizeLegacyProjects(inputProjects);
  const dataset = createEmptyProductionDataset();
  const customerByKey = new Map();
  const salespersonByKey = new Map();
  const crewByKey = new Map();

  projects.forEach((project) => {
    const customerKey = [project.customer, project.phone, project.city]
      .map(safeKey)
      .join('|');

    let customer = customerByKey.get(customerKey);
    if (!customer) {
      customer = createCustomer({
        ...metadata(legacyId('CUS', project.id)),
        displayName: project.customer || `Customer ${project.id}`,
        phone: project.phone,
        address: {
          city: project.city,
          state: project.region === 'Virginia' ? 'VA' : project.region === 'Carolina' ? 'NC' : '',
        },
        notes: project.notes,
      });
      customerByKey.set(customerKey, customer);
      dataset.customers.push(customer);
    }

    let salespersonId = '';
    if (project.salesperson) {
      const salespersonKey = safeKey(project.salesperson);
      let salesperson = salespersonByKey.get(salespersonKey);
      if (!salesperson) {
        salesperson = createTeamMember({
          ...metadata(legacyId('TMB-SALES', salespersonKey)),
          displayName: project.salesperson,
          employeeType: 'employee_or_contractor',
          department: 'sales',
          salesperson: true,
          active: true,
          regionAssignments: project.region ? [project.region] : [],
        });
        salespersonByKey.set(salespersonKey, salesperson);
        dataset.teamMembers.push(salesperson);
      }
      salespersonId = salesperson.id;
    }

    const leadId = legacyId('LED', project.id);
    if (project.leadSource || salespersonId) {
      dataset.leads.push(createLead({
        ...metadata(leadId),
        customerId: customer.id,
        assignedSalespersonId: salespersonId,
        source: project.leadSource,
        receivedAt: project.dateSold,
        dispositionedAt: project.dateSold,
        status: project.cancelled ? LEAD_STATUS.CANCELLED : LEAD_STATUS.SOLD,
      }));
    }

    const jobId = legacyId('JOB', project.id);
    const finalAmount = revisedAmount(project);
    const allScopesCompleted = project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate);
    const completionDates = project.scopes.map((scope) => scope.completionDate).filter(Boolean).sort();
    const completedAt = completionDates.at(-1) || '';
    const amountPaid = Math.max(0, Number(project.amountCollected ?? (project.collected ? finalAmount : project.deposit || 0)));
    const collectionDate = project.collectedDate || '';

    dataset.jobs.push(createJob({
      ...metadata(jobId),
      recordStatus: project.cancelled
        ? RECORD_STATUS.CANCELLED
        : project.collected && allScopesCompleted
          ? RECORD_STATUS.CLOSED
          : RECORD_STATUS.ACTIVE,
      customerId: customer.id,
      leadId: project.leadSource || salespersonId ? leadId : '',
      salespersonId,
      region: project.region,
      locationName: project.city,
      soldDate: project.dateSold,
      productionStage: inferJobStage(project),
      paymentStatus: project.collected
        ? PAYMENT_STATUS.PAID
        : allScopesCompleted
          ? PAYMENT_STATUS.FUNDING_PENDING
          : Number(project.deposit || 0) > 0
            ? PAYMENT_STATUS.DEPOSIT_RECEIVED
            : PAYMENT_STATUS.NOT_INVOICED,
      paymentType: project.paymentType,
      originalContractAmount: project.originalAmount,
      finalAmount,
      depositAmount: project.deposit,
      amountPaid,
      balanceDue: Math.max(0, finalAmount - amountPaid),
      fundedAt: project.collected ? collectionDate : '',
      collectedAt: project.collected ? collectionDate : '',
      closedAt: project.collected && allScopesCompleted ? (collectionDate || completedAt) : '',
      cancelledAt: project.cancellationDate,
      cancellationReason: project.cancellationReason,
      decisionNeeded: project.decisionNeeded,
      notes: project.notes,
      intake: project.intake,
      permit: project.permits,
    }));

    project.scopes.forEach((scope) => {
      let crewId = '';
      if (scope.crew) {
        const crewKey = safeKey(scope.crew);
        let crew = crewByKey.get(crewKey);
        if (!crew) {
          crew = createCrew({
            ...metadata(legacyId('CRW', crewKey)),
            name: scope.crew,
            crewType: 'subcontractor_or_internal',
            tradeCategories: scope.type ? [scope.type] : [],
            active: true,
          });
          crewByKey.set(crewKey, crew);
          dataset.crews.push(crew);
        } else if (scope.type && !crew.tradeCategories.includes(scope.type)) {
          crew.tradeCategories.push(scope.type);
        }
        crewId = crew.id;
      }

      dataset.workScopes.push(createWorkScope({
        ...metadata(legacyId('SCP', scope.id || `${project.id}-${scope.type}`)),
        recordStatus: project.cancelled
          ? RECORD_STATUS.CANCELLED
          : scope.completionDate
            ? RECORD_STATUS.COMPLETED
            : RECORD_STATUS.ACTIVE,
        jobId,
        category: scope.type,
        allocatedAmount: scope.allocatedAmount,
        productionStage: inferScopeStage(scope, project),
        measurerName: scope.measurer,
        crewId,
        crewName: scope.crew,
        vendor: scope.vendor,
        dates: {
          measureRequested: scope.measureRequested,
          measured: scope.measureCompleted,
          materialListReceived: scope.materialListReceived,
          materialsOrdered: scope.dateOrdered,
          materialEta: scope.materialETA,
          materialsReceived: scope.materialsIn,
          scheduledInstall: scope.scheduledInstallDate,
          started: scope.startDate,
          completed: scope.completionDate,
        },
        specs: scope.specs,
        notes: scope.notes,
      }));
    });

    project.changeOrders.forEach((changeOrder, index) => {
      dataset.changeOrders.push(createChangeOrder({
        ...metadata(legacyId('CO', `${project.id}-${changeOrder.id ?? index + 1}`)),
        jobId,
        status: 'approved',
        requestedAt: changeOrder.date,
        approvedAt: changeOrder.date,
        description: changeOrder.description || 'Legacy change order',
        amount: changeOrder.amount,
        customerApproved: true,
      }));
    });
  });

  const validation = validateProductionDataset(dataset);
  return { dataset, validation };
};
