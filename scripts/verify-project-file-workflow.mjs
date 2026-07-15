import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

class TestCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

const storage = new MemoryStorage();
const dispatchedEvents = [];

globalThis.CustomEvent = globalThis.CustomEvent || TestCustomEvent;
globalThis.localStorage = storage;
globalThis.window = {
  localStorage: storage,
  dispatchEvent(event) {
    dispatchedEvents.push(event);
    return true;
  },
  addEventListener() {},
  removeEventListener() {},
};

const LEGACY_KEY = 'mlb-dashboard-projects-v1';
const PRODUCTION_KEY = 'mlb-dashboard-production-dataset-v3';

const ownerProfile = {
  id: 'USR-TEST-OWNER',
  status: 'active',
  capabilities: {
    createProjects: true,
    manageBusinessData: true,
    manageSalesData: true,
    manageProductionData: true,
    manageFinancialData: true,
    legacyFullWrite: true,
  },
};

const initialProjects = [
  {
    id: 'P-TEST-1',
    customer: 'Workflow Test Customer',
    city: 'Carrollton',
    region: 'Virginia',
    phone: '555-0100',
    dateSold: '2026-07-01',
    salesperson: 'Hannah',
    leadSource: 'Referral',
    paymentType: 'Cash',
    originalAmount: 25000,
    deposit: 5000,
    collected: false,
    thankYouSent: false,
    cancelled: false,
    cancellationDate: '',
    cancellationReason: '',
    intake: {
      contractReceived: true,
      uploadedJN: true,
      estimateApproved: true,
      budgetCreated: true,
      invoiceCreated: true,
      fileCreated: true,
    },
    permits: {
      required: false,
      type: '',
      submittedDate: '',
      approvedDate: '',
      notes: '',
    },
    notes: 'Initial project note.',
    decisionNeeded: '',
    scopes: [
      {
        id: 'S-TEST-1',
        type: 'Roofs',
        measurer: 'Tito',
        measureRequested: '2026-07-02',
        measureCompleted: '2026-07-03',
        materialListReceived: '2026-07-03',
        dateOrdered: '2026-07-04',
        vendor: 'Test Supply',
        materialETA: '2026-07-10',
        materialsIn: '',
        crew: 'Roof Crew A',
        scheduledInstallDate: '',
        startDate: '',
        completionDate: '',
        specs: { Color: 'Charcoal' },
        notes: 'Initial scope note.',
      },
    ],
    changeOrders: [
      {
        id: 'CO-TEST-1',
        date: '2026-07-05',
        description: 'Approved wood replacement',
        amount: 750,
      },
    ],
  },
];

storage.setItem(LEGACY_KEY, JSON.stringify(initialProjects));

const {
  initializeLegacyWorkflowProduction,
  syncLegacyProjectsToProduction,
} = await import('../src/services/legacyWorkflowSyncService.js');

const clone = (value) => JSON.parse(JSON.stringify(value));
const readLegacy = () => JSON.parse(storage.getItem(LEGACY_KEY) || '[]');
const readDataset = () => JSON.parse(storage.getItem(PRODUCTION_KEY) || '{}');

const initialization = await initializeLegacyWorkflowProduction({
  projects: initialProjects,
  profile: ownerProfile,
});
assert.equal(initialization.initialized, true);

const baseline = readLegacy();
assert.equal(baseline.length, 1);
assert.ok(baseline[0]._production?.jobId);
assert.ok(baseline[0]._production?.customerId);
assert.ok(baseline[0].scopes[0]._production?.scopeId);
assert.ok(baseline[0].changeOrders[0]._production?.changeOrderId);

const firstEdit = clone(baseline);
firstEdit[0].notes = 'Updated through Open File.';
firstEdit[0].scopes[0].materialsIn = '2026-07-10';

const firstSave = await syncLegacyProjectsToProduction({
  projects: firstEdit,
  previousProjects: baseline,
  profile: ownerProfile,
  capabilities: ownerProfile.capabilities,
});
assert.equal(firstSave.saved, true);

let dataset = readDataset();
let job = dataset.jobs.find((record) => record.id === baseline[0]._production.jobId);
let scope = dataset.workScopes.find((record) => record.id === baseline[0].scopes[0]._production.scopeId);
assert.equal(job.notes, 'Updated through Open File.');
assert.equal(scope.dates.materialsReceived, '2026-07-10');
assert.ok(job.revision > baseline[0]._production.jobRevision);
assert.ok(dataset.activityLogs.some((record) => record.action === 'project_updated'));
assert.ok(dataset.statusEvents.some((record) => record.entityType === 'work_scope'));

const staleProjectFile = clone(readLegacy());
const secondEdit = clone(staleProjectFile);
secondEdit[0].city = 'Smithfield';

const secondSave = await syncLegacyProjectsToProduction({
  projects: secondEdit,
  previousProjects: staleProjectFile,
  profile: ownerProfile,
  capabilities: ownerProfile.capabilities,
});
assert.equal(secondSave.saved, true);

const staleEdit = clone(staleProjectFile);
staleEdit[0].phone = '555-9999';
await assert.rejects(
  () => syncLegacyProjectsToProduction({
    projects: staleEdit,
    previousProjects: staleProjectFile,
    profile: ownerProfile,
    capabilities: ownerProfile.capabilities,
  }),
  (error) => error?.code === 'LEGACY_WORKFLOW_REVISION_CONFLICT',
);

const latest = readLegacy();
assert.equal(latest[0].city, 'Smithfield');
assert.notEqual(latest[0].phone, '555-9999');

const lifecycleEdit = clone(latest);
lifecycleEdit[0].scopes = [];
lifecycleEdit[0].changeOrders = [];

const lifecycleSave = await syncLegacyProjectsToProduction({
  projects: lifecycleEdit,
  previousProjects: latest,
  profile: ownerProfile,
  capabilities: ownerProfile.capabilities,
});
assert.equal(lifecycleSave.saved, true);

dataset = readDataset();
job = dataset.jobs.find((record) => record.id === latest[0]._production.jobId);
scope = dataset.workScopes.find((record) => record.id === latest[0].scopes[0]._production.scopeId);
const changeOrder = dataset.changeOrders.find(
  (record) => record.id === latest[0].changeOrders[0]._production.changeOrderId,
);
assert.ok(job);
assert.equal(scope.recordStatus, 'archived');
assert.equal(changeOrder.status, 'void');
assert.equal(readLegacy()[0].scopes.length, 0);
assert.equal(readLegacy()[0].changeOrders.length, 0);
assert.ok(dispatchedEvents.some((event) => event.type === 'mlb-production-workflow-saved'));

console.log('Normalized New Project/Open File workflow verification passed.');
