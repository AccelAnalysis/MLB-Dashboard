import assert from 'node:assert/strict';
import { convertLegacyProjectsToProduction } from '../src/domain/legacyToProduction.js';
import { convertProductionToLegacyProjects } from '../src/domain/productionToLegacy.js';
import {
  createCollectionMetrics,
  createSalesStats,
  createSalesVsProductionMetrics,
  getCategoryRevenue,
  getProjectCompletionDate,
} from '../src/utils/projectMetrics.js';

const baseProject = {
  id: 'P-METRIC-1',
  customer: 'Metric Test Customer',
  city: 'Carrollton',
  region: 'Virginia',
  phone: '555-0101',
  dateSold: '2026-06-20',
  salesperson: 'Hannah',
  leadSource: 'Referral',
  paymentType: 'Cash',
  originalAmount: 30000,
  deposit: 5000,
  amountCollected: 30000,
  collectedDate: '2026-07-12',
  collected: true,
  thankYouSent: false,
  cancelled: false,
  cancellationDate: '',
  cancellationReason: '',
  changeOrders: [{ id: 'CO-1', date: '2026-07-01', description: 'Approved change', amount: 2000 }],
  intake: {},
  permits: {},
  notes: '',
  decisionNeeded: '',
  scopes: [
    {
      id: 'S-ROOF',
      type: 'Roofs',
      allocatedAmount: 20000,
      completionDate: '2026-07-08',
      specs: {},
      notes: '',
    },
    {
      id: 'S-GUTTER',
      type: 'Gutters',
      allocatedAmount: 12000,
      completionDate: '2026-07-10',
      specs: {},
      notes: '',
    },
  ],
};

assert.equal(getProjectCompletionDate(baseProject), '2026-07-10');
assert.deepEqual(getCategoryRevenue(baseProject, 'Roofs'), {
  matched: true,
  included: true,
  revenue: 20000,
  reason: null,
  allocatedTotal: 32000,
  revisedAmount: 32000,
});

const missingAllocation = structuredClone(baseProject);
missingAllocation.scopes[1].allocatedAmount = '';
assert.equal(getCategoryRevenue(missingAllocation, 'Roofs').included, false);
assert.equal(getCategoryRevenue(missingAllocation, 'Roofs').reason, 'ALLOCATION_REQUIRED');

const activity = [{
  id: 'SA-1',
  activityDate: '2026-07-05',
  salesperson: 'Hannah',
  region: 'Virginia',
  category: 'Roofs',
  leadSource: 'Referral',
  leads: 10,
  opportunities: 7,
}];
const salesStats = createSalesStats([baseProject], activity, { category: 'Roofs' });
assert.equal(salesStats.length, 1);
assert.equal(salesStats[0].leads, 10);
assert.equal(salesStats[0].projects, 1);
assert.equal(salesStats[0].revenue, 20000);
assert.equal(salesStats[0].closingRate, 0.1);
assert.equal(salesStats[0].valuePerLead, 2000);

const julyOnly = (date) => Boolean(date && date >= '2026-07-01' && date <= '2026-07-31');
const capacity = createSalesVsProductionMetrics([baseProject], {
  region: 'Virginia',
  category: 'All',
  matchesPeriod: julyOnly,
});
assert.equal(capacity.soldProjects, 0, 'Sold-date metrics must not pull a June sale into July.');
assert.equal(capacity.completedProjects, 1, 'Completion-date metrics must include a July completion.');
assert.equal(capacity.completedValue, 32000);
assert.equal(capacity.backlogMovement, -32000);

const collection = createCollectionMetrics([baseProject], {
  region: 'Virginia',
  category: 'All',
  matchesPeriod: julyOnly,
});
assert.equal(collection.measuredProjects, 1);
assert.equal(collection.avgCompletionToPayment, 2);
assert.equal(collection.openProjects, 0);
assert.equal(collection.missingCollectionDate, 0);

const conversion = convertLegacyProjectsToProduction([baseProject]);
assert.equal(conversion.validation.valid, true, conversion.validation.errors.join('\n'));
const job = conversion.dataset.jobs[0];
assert.equal(job.amountPaid, 30000);
assert.equal(job.balanceDue, 2000);
assert.equal(job.collectedAt, '2026-07-12');
assert.equal(job.fundedAt, '2026-07-12');
assert.equal(conversion.dataset.workScopes.find((scope) => scope.category === 'Roofs').allocatedAmount, 20000);

const restored = convertProductionToLegacyProjects(conversion.dataset)[0];
assert.equal(restored.amountCollected, 30000);
assert.equal(restored.collectedDate, '2026-07-12');
assert.equal(restored.scopes.find((scope) => scope.type === 'Gutters').allocatedAmount, 12000);

console.log('Metric integrity verification passed.');
