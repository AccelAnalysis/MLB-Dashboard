import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterCustomerProjects, matchesCustomerFilters } from '../src/utils/customerFilters.js';
import { createMetricResult, METRIC_IDS, metricRegistry } from '../src/metrics/metricRegistry.js';

const project = (overrides = {}) => ({
  id: 'P-1', customer: 'Alpha Home', city: 'Suffolk', phone: '555-1111', region: 'Virginia',
  dateSold: '2026-07-10', salesperson: 'Jordan', leadSource: 'Referral', paymentType: 'Cash',
  originalAmount: 100000, amountCollected: 25000, deposit: 25000, collected: false, collectedDate: '',
  cancelled: false, thankYouSent: false, changeOrders: [{ amount: 5000 }], notes: 'Priority family', decisionNeeded: 'Confirm color',
  scopes: [{ id: 'S-1', type: 'Roofs', crew: 'Crew A', measurer: 'Morgan', measureRequested: '2026-07-11', completionDate: '' }],
  ...overrides,
});
const projects = [
  project(),
  project({ id: 'P-2', customer: 'Beta House', city: 'Norfolk', dateSold: '2026-06-01', salesperson: 'Casey', originalAmount: 50000, changeOrders: [], amountCollected: 50000, collected: true, collectedDate: '2026-07-04', scopes: [{ id: 'S-2', type: 'Windows', crew: 'Crew B', measurer: 'Taylor', completionDate: '2026-07-02' }] }),
  project({ id: 'P-3', customer: 'Cancelled Job', cancelled: true, originalAmount: 25000, scopes: [{ id: 'S-3', type: 'Siding', completionDate: '' }] }),
];
const activity = [{ id: 'SA-1', activityDate: '2026-07-08', salesperson: 'Jordan', region: 'Virginia', category: 'Roofs', leadSource: 'Referral', leads: 10 }];

assert.equal(filterCustomerProjects(projects, { search: 'alpha' }).length, 1, 'searches customer');
assert.equal(filterCustomerProjects(projects, { search: 'casey' })[0].id, 'P-2', 'searches salesperson');
assert.equal(filterCustomerProjects(projects, { search: 'windows' })[0].id, 'P-2', 'searches scope');
assert.equal(filterCustomerProjects(projects, { sort: 'amount-desc' })[0].id, 'P-1', 'sorts revised amount');
assert.equal(filterCustomerProjects(projects, { sort: 'sold-asc' })[0].id, 'P-2', 'sorts sold date');
assert.equal(filterCustomerProjects(projects, { filters: { alerts: 'has' } }).some((item) => item.id === 'P-1'), true, 'filters alerts');
assert.equal(matchesCustomerFilters(projects[1], { status: 'awaiting-collection' }), false, 'does not treat collected completion as awaiting collection');
assert.equal(matchesCustomerFilters(projects[0], { salesperson: 'Jordan', productCategory: 'Roofs' }), true, 'combines filters');
assert.equal(filterCustomerProjects(projects, { search: 'missing' }).length, 0, 'supports empty results');
assert.equal(filterCustomerProjects(projects).length, 3, 'clear-all defaults restore results');

const filters = { period: 'All', region: 'Virginia', productCategory: 'All', salesperson: 'All', leadSource: 'All', paymentType: 'All' };
Object.values(METRIC_IDS).forEach((id) => assert.ok(metricRegistry[id], `${id} has stable registry configuration`));
const revenue = createMetricResult({ id: METRIC_IDS.SALES_REVENUE, projects, salesActivity: activity, filters });
assert.equal(revenue.value, 155000, 'cancelled project does not contribute recognized revenue');
assert.equal(revenue.supportingRecords.reduce((sum, row) => sum + row.metricValue, 0), revenue.value, 'supporting rows reconcile to revenue');
assert.deepEqual(revenue.timeSeries.map((point) => point.period), ['2026-06', '2026-07'], 'trend contains only actual record periods');
assert.equal(createMetricResult({ id: METRIC_IDS.LEADS_GIVEN, projects, salesActivity: activity, filters }).value, 10);
assert.equal(createMetricResult({ id: METRIC_IDS.CLOSE_RATE, projects, salesActivity: activity, filters }).value, 0.2);
assert.equal(createMetricResult({ id: METRIC_IDS.COMPLETED_VALUE, projects, salesActivity: activity, filters }).value, 50000, 'incomplete projects never enter completion-date metrics');
assert.equal(createMetricResult({ id: METRIC_IDS.COMPLETION_TO_PAYMENT, projects, salesActivity: activity, filters }).value, 2);

const cardSource = await readFile(new URL('../src/components/layout/MetricCard.jsx', import.meta.url), 'utf8');
assert.match(cardSource, /clamp\(/, 'metric value uses responsive clamp typography');
assert.match(cardSource, /type="button"/, 'interactive metric uses button semantics');
assert.match(cardSource, /focus-visible/, 'interactive metric has visible keyboard focus');
assert.match(cardSource, /Unavailable/, 'unavailable state is explicit');
const modalSource = await readFile(new URL('../src/components/metrics/MetricDrilldownModal.jsx', import.meta.url), 'utf8');
assert.match(modalSource, /event\.key === 'Escape'/, 'modal closes with Escape');
assert.match(modalSource, /Reset to Workspace Filters/, 'modal override can reset');
assert.match(modalSource, /Drilldown period differs from workspace/, 'modal override is visible');

console.log('Metric presentation and Customer workspace verification passed.');
