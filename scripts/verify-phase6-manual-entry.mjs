import assert from 'node:assert/strict';
import {
  calculateManualEntryFinancials,
  createEmptyManualChangeOrder,
  createEmptyManualEntryDraft,
  specsTextToObject,
  summarizeManualEntryJobs,
  validateManualEntryDraft,
} from '../src/domain/manualEntry.js';
import {
  createChangeOrder,
  createCustomer,
  createJob,
  createLead,
  createWorkScope,
} from '../src/domain/entityFactories.js';
import {
  CHANGE_ORDER_STATUS,
  PRODUCTION_STAGE,
  RECORD_STATUS,
} from '../src/domain/enums.js';
import { createEmptyProductionDataset } from '../src/domain/productionDataset.js';
import { convertProductionToLegacyProjects } from '../src/domain/productionToLegacy.js';
import { normalizeOperationalRecordStatuses } from '../src/domain/recordLifecycle.js';

const draft = createEmptyManualEntryDraft({ teamMemberId: 'TMB-SALES-1' });
draft.customer.displayName = 'Phase 6 Test Customer';
draft.customer.phone = '555-0100';
draft.customer.address.city = 'Carrollton';
draft.job.locationName = 'Carrollton';
draft.job.originalContractAmount = '25000';
draft.lead.source = 'Referral';
draft.scopes[0].category = 'Roofs';
draft.scopes[0].dates.measureRequested = '2026-07-01';
draft.scopes[0].dates.completed = '2026-07-15';

let validation = validateManualEntryDraft(draft, { isNew: true, canCreate: true });
assert.equal(validation.valid, true, validation.errors.join('\n'));

const changeOrder = createEmptyManualChangeOrder();
changeOrder.status = CHANGE_ORDER_STATUS.APPROVED;
changeOrder.description = 'Approved decking upgrade';
changeOrder.amount = '1500';
changeOrder.approvedAt = '2026-07-10';
draft.changeOrders.push(changeOrder);

const financials = calculateManualEntryFinancials(draft);
assert.equal(financials.revisedAmount, 26500);
assert.equal(financials.effectiveFinalAmount, 26500);
assert.deepEqual(specsTextToObject('Color: White\nQuantity: 12\nWarranty'), {
  Color: 'White',
  Quantity: '12',
  Warranty: '',
});

draft.scopes[0].dates.completed = '2026-06-30';
validation = validateManualEntryDraft(draft, { isNew: true, canCreate: true });
assert.equal(validation.valid, false);
assert.ok(validation.errors.some((message) => message.includes('cannot be before')));
draft.scopes[0].dates.completed = '2026-07-15';

const dataset = createEmptyProductionDataset();
const customer = createCustomer({ displayName: draft.customer.displayName, phone: draft.customer.phone, revision: 2 });
const lead = createLead({ customerId: customer.id, source: draft.lead.source, status: 'sold', revision: 3 });
const job = {
  ...createJob({
    customerId: customer.id,
    leadId: lead.id,
    region: 'Virginia',
    locationName: 'Carrollton',
    soldDate: '2026-07-01',
    originalContractAmount: 25000,
    finalAmount: 26500,
    balanceDue: 26500,
    productionStage: PRODUCTION_STAGE.COMPLETED,
    revision: 4,
  }),
  thankYouSent: true,
};
const activeScope = createWorkScope({
  jobId: job.id,
  category: 'Roofs',
  productionStage: PRODUCTION_STAGE.COMPLETED,
  revision: 5,
});
const archivedScope = createWorkScope({
  jobId: job.id,
  category: 'Repairs',
  recordStatus: RECORD_STATUS.ARCHIVED,
  productionStage: PRODUCTION_STAGE.COMPLETED,
});
const approvedOrder = createChangeOrder({
  jobId: job.id,
  status: CHANGE_ORDER_STATUS.APPROVED,
  description: 'Approved decking upgrade',
  amount: 1500,
  revision: 6,
});

dataset.customers.push(customer);
dataset.leads.push(lead);
dataset.jobs.push(job);
dataset.workScopes.push(activeScope, archivedScope);
dataset.changeOrders.push(approvedOrder);

const normalized = normalizeOperationalRecordStatuses(dataset);
assert.equal(normalized.jobs[0].recordStatus, RECORD_STATUS.COMPLETED);
assert.equal(normalized.workScopes[0].recordStatus, RECORD_STATUS.COMPLETED);
assert.equal(normalized.workScopes[1].recordStatus, RECORD_STATUS.ARCHIVED);

const summaries = summarizeManualEntryJobs(normalized);
assert.equal(summaries.length, 1);
assert.equal(summaries[0].scopeCount, 1);
assert.deepEqual(summaries[0].scopeCategories, ['Roofs']);

const legacy = convertProductionToLegacyProjects(normalized);
assert.equal(legacy.length, 1);
assert.equal(legacy[0].scopes.length, 1);
assert.equal(legacy[0].scopes[0].type, 'Roofs');
assert.equal(legacy[0].thankYouSent, true);
assert.equal(legacy[0]._production.jobId, job.id);
assert.equal(legacy[0]._production.jobRevision, 4);
assert.equal(legacy[0]._production.customerId, customer.id);
assert.equal(legacy[0]._production.customerRevision, 2);
assert.equal(legacy[0]._production.leadId, lead.id);
assert.equal(legacy[0]._production.leadRevision, 3);
assert.equal(legacy[0].scopes[0]._production.scopeId, activeScope.id);
assert.equal(legacy[0].scopes[0]._production.revision, 5);
assert.equal(legacy[0].changeOrders[0]._production.changeOrderId, approvedOrder.id);
assert.equal(legacy[0].changeOrders[0]._production.revision, 6);

console.log('Phase 6 normalized project-file verification passed.');
