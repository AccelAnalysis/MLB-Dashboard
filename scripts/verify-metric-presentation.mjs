import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterCustomerProjects, matchesCustomerFilters } from '../src/utils/customerFilters.js';
import { createMetricResult, METRIC_IDS, metricRegistry } from '../src/metrics/metricRegistry.js';
import { getComparisonPresentation } from '../src/metrics/metricFormatting.js';
import { getComparisonPeriod } from '../src/utils/comparisonPeriod.js';
import { createCollectionMetrics, createSalesVsProductionMetrics } from '../src/utils/projectMetrics.js';

const closeTo = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} !== ${expected}`);
const project = (id, overrides = {}) => ({
  id, customer: `Customer ${id}`, city: 'Suffolk', phone: '555-1111', region: 'Virginia',
  dateSold: '2026-07-10', salesperson: 'Jordan', leadSource: 'Referral', paymentType: 'Cash',
  originalAmount: 100, amountCollected: 0, deposit: 0, collected: false, funded: false,
  collectedDate: '', fundedDate: '', cancelled: false, thankYouSent: false, changeOrders: [], notes: '', decisionNeeded: '',
  scopes: [{ id: `${id}-S1`, type: 'Roofs', crew: 'Crew A', measurer: 'Morgan', completionDate: '' }],
  ...overrides,
});
const multiScopes = (id, completionDate, allocations) => [
  { id: `${id}-R`, type: 'Roofs', completionDate, allocatedAmount: allocations?.[0] ?? '' },
  { id: `${id}-S`, type: 'Siding', completionDate, allocatedAmount: allocations?.[1] ?? '' },
];

const projects = [
  project('P-VALID', { originalAmount: 120, scopes: [{ id: 'P-VALID-R', type: 'Roofs', completionDate: '2026-07-01' }], collected: true, collectedDate: '2026-07-04' }),
  project('P-BALANCED', { originalAmount: 100, dateSold: '2026-07-05', scopes: multiScopes('P-BALANCED', '2026-07-02', [60, 40]), collected: false }),
  project('P-SOLD-FAIL', { originalAmount: 90, dateSold: '2026-07-06', scopes: multiScopes('P-SOLD-FAIL', '2026-06-20') }),
  project('P-COMPLETE-FAIL', { originalAmount: 80, dateSold: '2026-06-05', scopes: multiScopes('P-COMPLETE-FAIL', '2026-07-07') }),
  project('P-MISSING-DATE', { dateSold: '2026-06-10', scopes: [{ id: 'P-MISSING-DATE-R', type: 'Roofs', completionDate: '2026-07-04' }], collected: true }),
  project('P-INVALID-DATE', { dateSold: '2026-06-11', scopes: [{ id: 'P-INVALID-DATE-R', type: 'Roofs', completionDate: '2026-07-06' }], collected: true, collectedDate: '2026-07-05' }),
  project('P-AWAITING', { dateSold: '2026-06-12', scopes: [{ id: 'P-AWAITING-R', type: 'Roofs', completionDate: '2026-07-03' }] }),
  project('P-PRIOR', { originalAmount: 50, dateSold: '2026-06-15', salesperson: 'Casey', leadSource: 'Website', scopes: [{ id: 'P-PRIOR-R', type: 'Roofs', completionDate: '2026-06-18' }], collected: true, collectedDate: '2026-06-20' }),
  project('P-CANCELLED', { dateSold: '2026-07-09', cancelled: true }),
];
const activity = [
  { id: 'SA-JUL', activityDate: '2026-07-08', salesperson: 'Jordan', region: 'Virginia', category: 'Roofs', leadSource: 'Referral', leads: 10 },
  { id: 'SA-JUN', activityDate: '2026-06-14', salesperson: 'Casey', region: 'Virginia', category: 'Roofs', leadSource: 'Website', leads: 5 },
];
const july = { period: 'Custom', customStart: '2026-07-01', customEnd: '2026-07-31', region: 'Virginia', productCategory: 'Roofs', salesperson: 'All', leadSource: 'All', paymentType: 'All' };
const all = { ...july, period: 'All', customStart: '', customEnd: '', productCategory: 'All' };

Object.values(METRIC_IDS).forEach((id) => assert.ok(metricRegistry[id], `${id} has stable registry configuration`));

// 1–3: allocation failures stay with their own revenue cohort; alert results never inherit them.
const revenue = createMetricResult({ id: METRIC_IDS.SALES_REVENUE, projects, salesActivity: activity, filters: july });
assert.deepEqual(revenue.excludedRecords.map((row) => row.projectId), ['P-SOLD-FAIL'], '1. revenue has only sold-period allocation failures');
const completed = createMetricResult({ id: METRIC_IDS.COMPLETED_VALUE, projects, salesActivity: activity, filters: july });
assert.deepEqual(completed.excludedRecords.map((row) => row.projectId), ['P-COMPLETE-FAIL'], '2. completed value has only completion-period allocation failures');
const alerts = createMetricResult({ id: METRIC_IDS.OPEN_BOTTLENECKS, projects, salesActivity: activity, filters: july });
assert.equal(alerts.excludedRecordCount, 0, '3. alerts have no allocation exclusions');
assert.equal(alerts.warnings.some((warning) => /allocat/i.test(warning)), false, '3. alerts have no allocation warning');

// 4–6: payment classification is exhaustive, visible, and negative intervals are retained as exclusions.
const payment = createMetricResult({ id: METRIC_IDS.COMPLETION_TO_PAYMENT, projects, salesActivity: activity, filters: july });
assert.deepEqual({ measured: payment.measuredProjectCount, awaiting: payment.awaitingCollectionCount, missing: payment.missingCollectionDateCount, invalid: payment.invalidCollectionDateCount }, { measured: 1, awaiting: 3, missing: 1, invalid: 1 }, '4. payment classifications are counted');
assert.equal(payment.excludedRecords.find((row) => row.projectId === 'P-INVALID-DATE').exclusionReason, 'Collection date is before final completion', '5. negative interval is explicitly excluded');
assert.equal(payment.warnings.some((warning) => /predates final completion/.test(warning)), true, '5. negative interval is warned');
assert.equal(payment.includedRecordCount, 1, '6. payment included count');
assert.equal(payment.excludedRecordCount, 5, '6. payment excluded count');

// 7: additive contribution fields, rather than revised contracts, visibly reconcile.
closeTo(revenue.supportingRecords.reduce((sum, row) => sum + row.metricContribution, 0), revenue.value, '7. revenue contributions reconcile');
closeTo(createMetricResult({ id: METRIC_IDS.LEADS_GIVEN, projects, salesActivity: activity, filters: july }).supportingRecords.reduce((sum, row) => sum + row.metricContribution, 0), 10, '7. lead contributions reconcile');

// 8–9: monthly ratio series use the same monthly numerator and denominator as their overall formulas.
const averageContract = createMetricResult({ id: METRIC_IDS.AVERAGE_CONTRACT, projects, salesActivity: activity, filters: july });
closeTo(averageContract.timeSeries.find((point) => point.period === '2026-07').value, revenue.value / 3, '8. monthly average contract uses revenue / sold projects');
const valuePerLead = createMetricResult({ id: METRIC_IDS.VALUE_PER_LEAD, projects, salesActivity: activity, filters: july });
closeTo(valuePerLead.timeSeries.find((point) => point.period === '2026-07').value, revenue.value / 10, '9. monthly value per lead uses revenue / leads');

// 10–11: real scope allocations drive product categories and no combined pseudo-category is emitted.
const allRevenue = createMetricResult({ id: METRIC_IDS.SALES_REVENUE, projects, salesActivity: activity, filters: all });
const categoryValues = Object.fromEntries(allRevenue.breakdowns.productCategory.map((row) => [row.label, row.value]));
assert.equal(categoryValues.Siding, 40, '10. balanced Siding allocation is used');
assert.ok(categoryValues.Roofs >= 60, '10. Roof allocations and single-scope revenue are aggregated');
assert.equal(Object.keys(categoryValues).some((label) => label.includes(',')), false, '11. no combined pseudo-category labels');

// 12–13: production has real grouped history; alerts use current-state alert bars by default.
const production = createMetricResult({ id: METRIC_IDS.PRODUCTION_TO_SALES, projects, salesActivity: activity, filters: all });
assert.ok(production.timeSeries.some((point) => point.bookedValue > 0 || point.completedValue > 0), '12. production/sales has monthly chart data');
assert.equal(production.timeSeriesType, 'groupedBar', '12. production/sales selects grouped bars');
assert.equal(alerts.defaultBreakdown, 'alertType', '13. alerts default to alert type');
assert.equal(alerts.timeSeries.length, 0, '13. no fabricated alert history');

// 14: all documented comparison windows are deterministic.
const now = new Date(2026, 6, 15);
assert.deepEqual([getComparisonPeriod({ period: 'Today' }, now).comparisonStart, getComparisonPeriod({ period: 'Today' }, now).comparisonEnd], ['2026-07-14', '2026-07-14'], '14. Today comparison');
assert.deepEqual([getComparisonPeriod({ period: 'WTD' }, now).comparisonStart, getComparisonPeriod({ period: 'WTD' }, now).comparisonEnd], ['2026-07-06', '2026-07-08'], '14. WTD elapsed comparison');
assert.deepEqual([getComparisonPeriod({ period: 'MTD' }, now).comparisonStart, getComparisonPeriod({ period: 'MTD' }, now).comparisonEnd], ['2026-06-01', '2026-06-15'], '14. MTD elapsed comparison');
assert.deepEqual([getComparisonPeriod({ period: 'QTD' }, now).comparisonStart, getComparisonPeriod({ period: 'QTD' }, now).comparisonEnd], ['2026-04-01', '2026-04-15'], '14. QTD elapsed comparison');
assert.deepEqual([getComparisonPeriod({ period: 'YTD' }, now).comparisonStart, getComparisonPeriod({ period: 'YTD' }, now).comparisonEnd], ['2025-01-01', '2025-07-15'], '14. YTD comparison');
assert.deepEqual([getComparisonPeriod({ period: 'Custom', customStart: '2026-07-10', customEnd: '2026-07-15' }, now).comparisonStart, getComparisonPeriod({ period: 'Custom', customStart: '2026-07-10', customEnd: '2026-07-15' }, now).comparisonEnd], ['2026-07-04', '2026-07-09'], '14. custom equal-length comparison');
assert.equal(getComparisonPeriod({ period: 'All' }, now), null, '14. All comparison unavailable');

// 15–16: semantic direction, not arithmetic sign alone, controls comparison sentiment.
assert.equal(getComparisonPresentation({ improvementDirection: 'lower', comparisonPercentChange: 0.1 }).sentiment, 'unfavorable', '15. rising Cancel Rate is unfavorable');
assert.equal(getComparisonPresentation({ improvementDirection: 'lower', comparisonPercentChange: -0.1 }).sentiment, 'favorable', '16. falling completion-to-payment is favorable');

// 17: salesperson and lead-source filters apply consistently to both record sources.
const jordan = { ...july, productCategory: 'All', salesperson: 'Jordan', leadSource: 'Referral' };
assert.equal(createMetricResult({ id: METRIC_IDS.PROJECTS_SOLD, projects, salesActivity: activity, filters: jordan }).value, 3, '17. project salesperson/source filter');
assert.equal(createMetricResult({ id: METRIC_IDS.LEADS_GIVEN, projects, salesActivity: activity, filters: jordan }).value, 10, '17. activity salesperson/source filter');
assert.equal(createMetricResult({ id: METRIC_IDS.LEADS_GIVEN, projects, salesActivity: activity, filters: { ...jordan, salesperson: 'Casey' } }).value, 0, '17. mismatched activity is removed');

// 18–20: one contextual creation control and the established Project File callbacks remain wired.
const dashboardSource = await readFile(new URL('../src/MLBDashboard_field_complete.jsx', import.meta.url), 'utf8');
const customerSource = await readFile(new URL('../src/components/production/CustomerWorkspace.jsx', import.meta.url), 'utf8');
assert.equal((customerSource.match(/>New Project<\/button>/g) || []).length, 1, '18. one Customer operator New Project control');
assert.equal(/global-new-project/.test(dashboardSource), false, '18. global New Project removed');
assert.match(dashboardSource, /onNewProject=\{\(\) => openProjectFile\(emptyProject\(\), \{ initialTab: 'overview' \}\)\}/, '19. New Project opens existing Project File');
assert.match(customerSource, /openProjectFile\(project, \{ initialTab: 'overview' \}\)/, '20. Open File opens existing Project File');

// Retain baseline Customer presentation and validated utility reconciliation coverage.
assert.equal(filterCustomerProjects(projects, { search: 'customer p-valid' }).length, 1, 'Customer search');
assert.equal(matchesCustomerFilters(projects[0], { status: 'production-completed' }), true, 'explicit completed status');
assert.equal(matchesCustomerFilters(projects[1], { status: 'awaiting-collection' }), true, 'awaiting is completed subset');
const utilityCapacity = createSalesVsProductionMetrics(projects, { region: 'Virginia', category: 'All', matchesPeriod: () => true });
closeTo(production.value, utilityCapacity.productionToSalesRatio, 'registry production ratio reconciles to validated utility');
const utilityCollection = createCollectionMetrics(projects, { region: 'Virginia', category: 'Roofs', matchesPeriod: (date) => date >= '2026-07-01' && date <= '2026-07-31' });
closeTo(payment.value, utilityCollection.avgCompletionToPayment, 'registry collection average reconciles to validated utility');

const cardSource = await readFile(new URL('../src/components/layout/MetricCard.jsx', import.meta.url), 'utf8');
assert.match(cardSource, /clamp\(/, 'responsive metric typography retained');
assert.match(cardSource, /getComparisonPresentation/, 'metric-aware comparison styling wired');
const modalSource = await readFile(new URL('../src/components/metrics/MetricDrilldownModal.jsx', import.meta.url), 'utf8');
assert.match(modalSource, /event\.key === 'Escape'/, 'modal closes with Escape');
assert.match(modalSource, /Excluded records/, 'excluded records remain visibly separated');

console.log('Metric presentation and Customer workspace verification passed (20 required correction cases plus baseline coverage).');
