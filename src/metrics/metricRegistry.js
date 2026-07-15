import {
  createCompletionPaymentDetails,
  createRecognizedRevenueCohort,
  createSalesVsProductionMetrics,
  getProjectCategoryAllocations,
  getProjectCompletionDate,
} from '../utils/projectMetrics';
import { getProjectAlerts, getRevisedAmount } from '../utils/projectStatus';
import { isInPeriod } from '../utils/periodUtils';
import { getComparisonPeriod } from '../utils/comparisonPeriod';

export const METRIC_IDS = {
  SALES_REVENUE: 'sales_revenue', PROJECTS_SOLD: 'projects_sold', AVERAGE_CONTRACT: 'average_contract',
  LEADS_GIVEN: 'leads_given', CLOSE_RATE: 'close_rate', VALUE_PER_LEAD: 'value_per_lead', CANCEL_RATE: 'cancel_rate',
  BOOKED_VALUE: 'booked_value', COMPLETED_VALUE: 'completed_value', PRODUCTION_TO_SALES: 'production_to_sales',
  BACKLOG_MOVEMENT: 'backlog_movement', COMPLETION_TO_PAYMENT: 'completion_to_payment', OPEN_BOTTLENECKS: 'open_bottlenecks',
};

export const metricRegistry = {
  sales_revenue: { label: 'Sales Revenue', description: 'Recognized revised contract value for non-cancelled projects sold in the selected period.', formula: 'Sum of Original Contract + approved Change Orders for included sold projects.', format: 'currency', dateBasis: 'Project Date Sold', improvementDirection: 'higher', defaultBreakdown: 'time' },
  projects_sold: { label: 'Projects Sold', description: 'Non-cancelled Project Files sold in the selected period.', formula: 'Count of non-cancelled Project Files by Date Sold.', format: 'count', dateBasis: 'Project Date Sold', improvementDirection: 'higher', defaultBreakdown: 'time' },
  average_contract: { label: 'Average Contract', description: 'Average recognized revised contract value per non-cancelled sold project.', formula: 'Recognized Sales Revenue ÷ non-cancelled Projects Sold.', format: 'currency', dateBasis: 'Project Date Sold', improvementDirection: 'higher', defaultBreakdown: 'time' },
  leads_given: { label: 'Leads Given', description: 'Lead volume entered through dated Sales Activity records.', formula: 'Sum of Leads from Sales Activity.', format: 'count', dateBasis: 'Sales Activity Date', improvementDirection: 'neutral', defaultBreakdown: 'time' },
  close_rate: { label: 'Close Rate', description: 'Sold projects relative to recorded lead volume.', formula: 'Projects Sold ÷ Leads Given.', format: 'percentage', dateBasis: 'Project Date Sold and Sales Activity Date', improvementDirection: 'higher', defaultBreakdown: 'time' },
  value_per_lead: { label: 'Value per Lead', description: 'Recognized sold revenue generated per recorded lead.', formula: 'Recognized Sales Revenue ÷ Leads Given.', format: 'currency', dateBasis: 'Project Date Sold and Sales Activity Date', improvementDirection: 'higher', defaultBreakdown: 'time' },
  cancel_rate: { label: 'Cancel Rate', description: 'Cancelled sold projects as a share of all sold project files.', formula: 'Cancelled Projects ÷ all Projects Sold.', format: 'percentage', dateBasis: 'Project Date Sold', improvementDirection: 'lower', defaultBreakdown: 'time' },
  booked_value: { label: 'Booked in Period', description: 'Recognized revised contract value booked by Date Sold.', formula: 'Sum of recognized revised contract value for projects sold in period.', format: 'currency', dateBasis: 'Project Date Sold', improvementDirection: 'neutral', defaultBreakdown: 'time' },
  completed_value: { label: 'Completed in Period', description: 'Recognized project value whose final project completion occurred in the period.', formula: 'Sum of recognized revised contract value by final Project Completion Date.', format: 'currency', dateBasis: 'Final Project Completion Date', improvementDirection: 'higher', defaultBreakdown: 'time' },
  production_to_sales: { label: 'Production / Sales', description: 'Completed value compared with booked value for the selected period.', formula: 'Completed in Period ÷ Booked in Period.', format: 'percentage', dateBasis: 'Date Sold and Final Project Completion Date', improvementDirection: 'neutral', defaultBreakdown: 'time', timeSeriesType: 'groupedBar' },
  backlog_movement: { label: 'Backlog Movement', description: 'Net booked value added to backlog after completed value.', formula: 'Booked in Period − Completed in Period.', format: 'currency', dateBasis: 'Date Sold and Final Project Completion Date', improvementDirection: 'neutral', defaultBreakdown: 'time' },
  completion_to_payment: { label: 'Complete to Payment', description: 'Average days from final project completion to collected or funded date.', formula: 'Average of Collected/Funded Date − Final Project Completion Date; invalid or missing dates are excluded and reported.', format: 'days', dateBasis: 'Final Project Completion Date', improvementDirection: 'lower', defaultBreakdown: 'time' },
  open_bottlenecks: { label: 'Open Alerts', description: 'Current project and scope alerts requiring operational attention.', formula: 'Count of alerts produced by the validated project alert rules.', format: 'count', dateBasis: 'Current operational state', improvementDirection: 'lower', defaultBreakdown: 'alertType', timeSeriesType: 'bar' },
};

const ALL = 'All';
const allocationReasonLabels = {
  ALLOCATION_REQUIRED: 'Scope allocation required',
  ALLOCATION_TOTAL_MISMATCH: 'Scope allocations do not equal revised contract',
};
const paymentReasonLabels = {
  AWAITING_COLLECTION: 'Awaiting collection',
  MISSING_COLLECTION_DATE: 'Missing collection date',
  INVALID_DATE_ORDER: 'Collection date is before final completion',
};
const monthKey = (date) => date?.slice(0, 7) || '';
const plural = (count, singular, pluralLabel = `${singular}s`) => `${count} ${count === 1 ? singular : pluralLabel}`;
const dimensionMatches = (value, expected) => !expected || expected === ALL || value === expected;
const inPeriod = (date, filters) => Boolean(date) && isInPeriod(date, filters.period || ALL, filters.customStart || '', filters.customEnd || '');

const projectMatches = (project, filters, { category = true } = {}) => (
  dimensionMatches(project.region, filters.region)
  && dimensionMatches(project.salesperson, filters.salesperson)
  && dimensionMatches(project.leadSource, filters.leadSource)
  && dimensionMatches(project.paymentType, filters.paymentType)
  && (!category || !filters.productCategory || filters.productCategory === ALL || (project.scopes || []).some((scope) => scope.type === filters.productCategory))
);

const activityMatches = (record, filters) => (
  dimensionMatches(record.region, filters.region)
  && dimensionMatches(record.salesperson, filters.salesperson)
  && dimensionMatches(record.leadSource, filters.leadSource)
  && dimensionMatches(record.category, filters.productCategory)
);

const projectRow = (project, extra = {}) => ({
  id: project.id,
  projectId: project.id,
  customer: project.customer,
  salesperson: project.salesperson || 'Unassigned',
  dateSold: project.dateSold,
  productCategory: [...new Set((project.scopes || []).map((scope) => scope.type).filter(Boolean))].join(', ') || 'Unassigned',
  originalContract: Number(project.originalAmount || 0),
  revisedContract: getRevisedAmount(project),
  completionDate: getProjectCompletionDate(project),
  collectionDate: project.collectedDate || project.fundedDate || '',
  leadSource: project.leadSource || 'Unassigned',
  region: project.region || 'Unassigned',
  paymentType: project.paymentType || 'Unassigned',
  ...extra,
});

const activityRow = (record, extra = {}) => ({
  id: record.id,
  salesperson: record.salesperson || 'Unassigned',
  leadSource: record.leadSource || 'Unassigned',
  region: record.region || 'Unassigned',
  productCategory: record.category || 'Unassigned',
  activityDate: record.activityDate,
  leads: Number(record.leads || 0),
  ...extra,
});

const revenueCohort = (projects, filters, getDate) => createRecognizedRevenueCohort(projects, {
  region: filters.region,
  category: filters.productCategory,
  salesperson: filters.salesperson,
  leadSource: filters.leadSource,
  paymentType: filters.paymentType,
  matchesPeriod: (date) => inPeriod(date, filters),
  getDate,
});

const dedupeExcluded = (records) => {
  const deduped = new Map();
  records.forEach((record) => {
    const key = `${record.projectId || record.id}:${record.exclusionCode || record.exclusionReason}`;
    const current = deduped.get(key);
    if (!current) deduped.set(key, record);
    else deduped.set(key, { ...current, exclusionContext: [...new Set([...(current.exclusionContext || []), ...(record.exclusionContext || [])])] });
  });
  return [...deduped.values()];
};

const allocationExclusionRows = (items, context) => items.map((item) => projectRow(item.project, {
  exclusionCode: item.reason,
  exclusionReason: allocationReasonLabels[item.reason] || item.reason,
  exclusionContext: [context],
}));

const sumByMonth = (entries, valueKey = 'value') => {
  const grouped = new Map();
  entries.forEach((entry) => {
    if (!entry.date) return;
    const period = monthKey(entry.date);
    grouped.set(period, (grouped.get(period) || 0) + Number(entry[valueKey] || 0));
  });
  return grouped;
};

const ratioSeries = (numeratorEntries, denominatorEntries) => {
  const numerator = sumByMonth(numeratorEntries);
  const denominator = sumByMonth(denominatorEntries);
  return [...new Set([...numerator.keys(), ...denominator.keys()])].sort().flatMap((period) => {
    const denominatorValue = denominator.get(period) || 0;
    return denominatorValue ? [{ period, value: (numerator.get(period) || 0) / denominatorValue }] : [];
  });
};

const sumSeries = (entries) => [...sumByMonth(entries).entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, value]) => ({ period, value }));

const averageSeries = (entries) => {
  const totals = new Map();
  entries.forEach((entry) => {
    if (!entry.date) return;
    const period = monthKey(entry.date);
    const current = totals.get(period) || { total: 0, count: 0 };
    current.total += Number(entry.value || 0);
    current.count += 1;
    totals.set(period, current);
  });
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, item]) => ({ period, value: item.total / item.count }));
};

const sumBreakdown = (records, key, format = 'count') => {
  const grouped = new Map();
  records.forEach((record) => {
    const label = record[key] || 'Unassigned';
    grouped.set(label, (grouped.get(label) || 0) + Number(record.metricContribution || 0));
  });
  return [...grouped.entries()].map(([label, value]) => ({ label, value, format })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};

const averageBreakdown = (records, key, format) => {
  const grouped = new Map();
  records.forEach((record) => {
    const label = record[key] || 'Unassigned';
    const item = grouped.get(label) || { total: 0, count: 0 };
    item.total += Number(record.metricContribution || 0);
    item.count += 1;
    grouped.set(label, item);
  });
  return [...grouped.entries()].map(([label, item]) => ({ label, value: item.total / item.count, format })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};

const ratioBreakdown = (numeratorRecords, denominatorRecords, key, format, numeratorKey = 'metricContribution', denominatorKey = 'metricContribution') => {
  const numerator = new Map();
  const denominator = new Map();
  numeratorRecords.forEach((record) => { const label = record[key] || 'Unassigned'; numerator.set(label, (numerator.get(label) || 0) + Number(record[numeratorKey] || 0)); });
  denominatorRecords.forEach((record) => { const label = record[key] || 'Unassigned'; denominator.set(label, (denominator.get(label) || 0) + Number(record[denominatorKey] || 0)); });
  return [...new Set([...numerator.keys(), ...denominator.keys()])].flatMap((label) => denominator.get(label) ? [{ label, value: (numerator.get(label) || 0) / denominator.get(label), format }] : []).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};

const revenueCategoryBreakdown = (cohort, selectedCategory = ALL) => {
  const grouped = new Map();
  const omitted = [];
  cohort.included.forEach((item) => {
    if (selectedCategory && selectedCategory !== ALL) {
      grouped.set(selectedCategory, (grouped.get(selectedCategory) || 0) + item.revenue);
      return;
    }
    const allocation = getProjectCategoryAllocations(item.project);
    if (!allocation.included) {
      omitted.push(item.project.id);
      return;
    }
    allocation.allocations.forEach(({ category, amount }) => grouped.set(category, (grouped.get(category) || 0) + amount));
  });
  return {
    values: [...grouped.entries()].map(([label, value]) => ({ label, value, format: 'currency' })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
    omittedProjectCount: new Set(omitted).size,
  };
};

const paymentCategoryBreakdown = (records) => {
  const expanded = records.flatMap((record) => [...new Set((record.scopeCategories || []).filter(Boolean))].map((category) => ({ ...record, groupCategory: category })));
  return averageBreakdown(expanded, 'groupCategory', 'days');
};

const baseResult = (id, projects, salesActivity, filters) => {
  const definition = metricRegistry[id];
  if (!definition) throw new Error(`Unknown metric ID: ${id}`);
  const soldRevenue = revenueCohort(projects, filters, (project) => project.dateSold);
  const completedRevenue = revenueCohort(projects, filters, getProjectCompletionDate);
  const soldAll = projects.filter((project) => projectMatches(project, filters) && inPeriod(project.dateSold, filters));
  const soldProjects = soldAll.filter((project) => !project.cancelled);
  const cancelledProjects = soldAll.filter((project) => project.cancelled);
  const activities = salesActivity.filter((record) => activityMatches(record, filters) && inPeriod(record.activityDate, filters));
  const leads = activities.reduce((sum, record) => sum + Number(record.leads || 0), 0);
  const revenueRows = soldRevenue.included.map((item) => projectRow(item.project, { metricContribution: item.revenue, contributionFormat: 'currency', contributionLabel: 'Recognized sold revenue' }));
  const completedRows = completedRevenue.included.map((item) => projectRow(item.project, { metricContribution: item.revenue, contributionFormat: 'currency', contributionLabel: 'Recognized completed value' }));
  const soldRows = soldProjects.map((project) => projectRow(project, { metricContribution: 1, contributionFormat: 'count', contributionLabel: 'Sold project' }));
  const allSoldRows = soldAll.map((project) => projectRow(project, { cancelled: Boolean(project.cancelled), metricContribution: project.cancelled ? 1 : 0, contributionFormat: 'count', contributionLabel: 'Cancellation numerator' }));
  const activityRows = activities.map((record) => activityRow(record, { metricContribution: Number(record.leads || 0), contributionFormat: 'count', contributionLabel: 'Recorded leads' }));
  const soldExclusions = allocationExclusionRows(soldRevenue.excluded, 'Sold period');
  const completedExclusions = allocationExclusionRows(completedRevenue.excluded, 'Completion period');
  const categoryBreakdown = revenueCategoryBreakdown(id === METRIC_IDS.COMPLETED_VALUE ? completedRevenue : soldRevenue, filters.productCategory);
  const base = {
    id,
    ...definition,
    value: null,
    includedRecordCount: 0,
    excludedRecordCount: 0,
    contextRecordCount: 0,
    countSummary: '',
    supportingRecords: [],
    excludedRecords: [],
    warnings: [],
    timeSeries: [],
    breakdowns: {},
    breakdownLabels: {},
    comparisonValue: null,
    comparisonAbsoluteChange: null,
    comparisonPercentChange: null,
    comparisonChange: null,
    comparisonLabel: null,
    _comparisonDataCount: 0,
  };

  if ([METRIC_IDS.SALES_REVENUE, METRIC_IDS.BOOKED_VALUE].includes(id)) {
    base.value = soldRevenue.value;
    base.supportingRecords = revenueRows;
    base.excludedRecords = soldExclusions;
    base.includedRecordCount = revenueRows.length;
    base.excludedRecordCount = soldExclusions.length;
    base.countSummary = `${plural(revenueRows.length, 'included project')} · ${plural(soldExclusions.length, 'excluded project')}`;
    base.warnings = soldExclusions.length ? [`${plural(soldExclusions.length, 'sold project')} excluded because product-category allocation is incomplete or unbalanced.`] : [];
    base.timeSeries = sumSeries(soldRevenue.included.map((item) => ({ date: item.date, value: item.revenue })));
    base.breakdowns = {
      salesperson: sumBreakdown(revenueRows, 'salesperson', 'currency'),
      leadSource: sumBreakdown(revenueRows, 'leadSource', 'currency'),
      region: sumBreakdown(revenueRows, 'region', 'currency'),
      paymentType: sumBreakdown(revenueRows, 'paymentType', 'currency'),
      productCategory: categoryBreakdown.values,
    };
    base.breakdownLabels = { salesperson: 'By salesperson', leadSource: 'By lead source', region: 'By region', paymentType: 'By payment type', productCategory: 'By product category' };
    if (categoryBreakdown.omittedProjectCount) base.warnings.push(`${plural(categoryBreakdown.omittedProjectCount, 'project')} omitted from the Product Category breakdown because balanced scope allocations are unavailable; the overall metric remains recognized at project level.`);
    base._comparisonDataCount = soldRevenue.projectCount;
  }

  if (id === METRIC_IDS.PROJECTS_SOLD) {
    base.value = soldProjects.length;
    base.supportingRecords = soldRows;
    base.includedRecordCount = soldRows.length;
    base.countSummary = plural(soldRows.length, 'sold project');
    base.timeSeries = sumSeries(soldRows.map((row) => ({ date: row.dateSold, value: 1 })));
    base.breakdowns = {
      salesperson: sumBreakdown(soldRows, 'salesperson'), leadSource: sumBreakdown(soldRows, 'leadSource'),
      region: sumBreakdown(soldRows, 'region'), paymentType: sumBreakdown(soldRows, 'paymentType'),
    };
    base.breakdownLabels = { salesperson: 'By salesperson', leadSource: 'By lead source', region: 'By region', paymentType: 'By payment type' };
    base._comparisonDataCount = soldAll.length;
  }

  if (id === METRIC_IDS.AVERAGE_CONTRACT) {
    base.value = soldProjects.length ? soldRevenue.value / soldProjects.length : null;
    base.supportingRecords = revenueRows;
    base.excludedRecords = soldExclusions;
    base.includedRecordCount = revenueRows.length;
    base.excludedRecordCount = soldExclusions.length;
    base.contextRecordCount = soldProjects.length;
    base.countSummary = `${plural(soldProjects.length, 'sold project')} · ${plural(soldExclusions.length, 'revenue exclusion')}`;
    base.warnings = soldExclusions.length ? [`${plural(soldExclusions.length, 'sold project')} contributes to the project denominator but not recognized category revenue until allocations balance.`] : [];
    base.timeSeries = ratioSeries(
      soldRevenue.included.map((item) => ({ date: item.date, value: item.revenue })),
      soldProjects.map((project) => ({ date: project.dateSold, value: 1 })),
    );
    base.breakdowns = {
      salesperson: ratioBreakdown(revenueRows, soldRows, 'salesperson', 'currency'),
      leadSource: ratioBreakdown(revenueRows, soldRows, 'leadSource', 'currency'),
      region: ratioBreakdown(revenueRows, soldRows, 'region', 'currency'),
      paymentType: ratioBreakdown(revenueRows, soldRows, 'paymentType', 'currency'),
    };
    base.breakdownLabels = { salesperson: 'By salesperson', leadSource: 'By lead source', region: 'By region', paymentType: 'By payment type' };
    base._comparisonDataCount = soldProjects.length;
  }

  if (id === METRIC_IDS.LEADS_GIVEN) {
    base.value = leads;
    base.supportingRecords = activityRows;
    base.includedRecordCount = activityRows.length;
    base.countSummary = `${plural(activityRows.length, 'activity record')} · ${plural(leads, 'lead')}`;
    base.timeSeries = sumSeries(activityRows.map((row) => ({ date: row.activityDate, value: row.metricContribution })));
    base.breakdowns = {
      salesperson: sumBreakdown(activityRows, 'salesperson'), leadSource: sumBreakdown(activityRows, 'leadSource'),
      region: sumBreakdown(activityRows, 'region'), productCategory: sumBreakdown(activityRows, 'productCategory'),
    };
    base.breakdownLabels = { salesperson: 'By salesperson', leadSource: 'By lead source', region: 'By region', productCategory: 'By Sales Activity category' };
    base._comparisonDataCount = activityRows.length;
  }

  if (id === METRIC_IDS.CLOSE_RATE) {
    base.value = leads ? soldProjects.length / leads : null;
    base.supportingRecords = [
      ...soldRows.map((row) => ({ ...row, recordType: 'Sold project', contextual: true })),
      ...activityRows.map((row) => ({ ...row, recordType: 'Lead activity', contextual: true })),
    ];
    base.contextRecordCount = base.supportingRecords.length;
    base.countSummary = `${plural(soldProjects.length, 'sold project')} · ${plural(leads, 'lead')}`;
    base.timeSeries = ratioSeries(soldRows.map((row) => ({ date: row.dateSold, value: 1 })), activityRows.map((row) => ({ date: row.activityDate, value: row.metricContribution })));
    base.breakdowns = {
      salesperson: ratioBreakdown(soldRows, activityRows, 'salesperson', 'percentage'),
      leadSource: ratioBreakdown(soldRows, activityRows, 'leadSource', 'percentage'),
      region: ratioBreakdown(soldRows, activityRows, 'region', 'percentage'),
    };
    base.breakdownLabels = { salesperson: 'By salesperson', leadSource: 'By lead source', region: 'By region' };
    base._comparisonDataCount = leads ? activityRows.length : 0;
  }

  if (id === METRIC_IDS.VALUE_PER_LEAD) {
    base.value = leads ? soldRevenue.value / leads : null;
    base.supportingRecords = [
      ...revenueRows.map((row) => ({ ...row, recordType: 'Recognized revenue', contextual: true })),
      ...activityRows.map((row) => ({ ...row, recordType: 'Lead activity', contextual: true })),
    ];
    base.excludedRecords = soldExclusions;
    base.excludedRecordCount = soldExclusions.length;
    base.contextRecordCount = base.supportingRecords.length;
    base.countSummary = `${plural(revenueRows.length, 'revenue project')} · ${plural(leads, 'lead')} · ${plural(soldExclusions.length, 'excluded project')}`;
    base.warnings = soldExclusions.length ? [`${plural(soldExclusions.length, 'sold project')} excluded from recognized category revenue; lead denominator is unchanged.`] : [];
    base.timeSeries = ratioSeries(soldRevenue.included.map((item) => ({ date: item.date, value: item.revenue })), activityRows.map((row) => ({ date: row.activityDate, value: row.metricContribution })));
    base.breakdowns = {
      salesperson: ratioBreakdown(revenueRows, activityRows, 'salesperson', 'currency'),
      leadSource: ratioBreakdown(revenueRows, activityRows, 'leadSource', 'currency'),
      region: ratioBreakdown(revenueRows, activityRows, 'region', 'currency'),
    };
    base.breakdownLabels = { salesperson: 'By salesperson', leadSource: 'By lead source', region: 'By region' };
    base._comparisonDataCount = leads ? activityRows.length : 0;
  }

  if (id === METRIC_IDS.CANCEL_RATE) {
    base.value = soldAll.length ? cancelledProjects.length / soldAll.length : null;
    base.supportingRecords = allSoldRows.map((row) => ({ ...row, recordType: row.cancelled ? 'Cancelled project' : 'Retained project', contextual: true }));
    base.contextRecordCount = allSoldRows.length;
    base.countSummary = `${plural(cancelledProjects.length, 'cancelled project')} · ${plural(soldAll.length, 'total sold project')}`;
    base.timeSeries = ratioSeries(cancelledProjects.map((project) => ({ date: project.dateSold, value: 1 })), soldAll.map((project) => ({ date: project.dateSold, value: 1 })));
    const cancelledRows = allSoldRows.filter((row) => row.cancelled).map((row) => ({ ...row, metricContribution: 1 }));
    const denominatorRows = allSoldRows.map((row) => ({ ...row, metricContribution: 1 }));
    base.breakdowns = {
      salesperson: ratioBreakdown(cancelledRows, denominatorRows, 'salesperson', 'percentage'),
      leadSource: ratioBreakdown(cancelledRows, denominatorRows, 'leadSource', 'percentage'),
      region: ratioBreakdown(cancelledRows, denominatorRows, 'region', 'percentage'),
      paymentType: ratioBreakdown(cancelledRows, denominatorRows, 'paymentType', 'percentage'),
    };
    base.breakdownLabels = { salesperson: 'By salesperson', leadSource: 'By lead source', region: 'By region', paymentType: 'By payment type' };
    base._comparisonDataCount = soldAll.length;
  }

  if (id === METRIC_IDS.COMPLETED_VALUE) {
    base.value = completedRevenue.value;
    base.supportingRecords = completedRows;
    base.excludedRecords = completedExclusions;
    base.includedRecordCount = completedRows.length;
    base.excludedRecordCount = completedExclusions.length;
    base.countSummary = `${plural(completedRows.length, 'included completed project')} · ${plural(completedExclusions.length, 'excluded project')}`;
    base.warnings = completedExclusions.length ? [`${plural(completedExclusions.length, 'completed project')} excluded because product-category allocation is incomplete or unbalanced.`] : [];
    base.timeSeries = sumSeries(completedRevenue.included.map((item) => ({ date: item.date, value: item.revenue })));
    base.breakdowns = {
      salesperson: sumBreakdown(completedRows, 'salesperson', 'currency'), region: sumBreakdown(completedRows, 'region', 'currency'),
      paymentType: sumBreakdown(completedRows, 'paymentType', 'currency'), productCategory: categoryBreakdown.values,
    };
    base.breakdownLabels = { salesperson: 'By salesperson', region: 'By region', paymentType: 'By payment type', productCategory: 'By product category' };
    if (categoryBreakdown.omittedProjectCount) base.warnings.push(`${plural(categoryBreakdown.omittedProjectCount, 'project')} omitted from the Product Category breakdown because balanced scope allocations are unavailable.`);
    base._comparisonDataCount = completedRevenue.projectCount;
  }

  if ([METRIC_IDS.PRODUCTION_TO_SALES, METRIC_IDS.BACKLOG_MOVEMENT].includes(id)) {
    const capacity = createSalesVsProductionMetrics(projects, {
      region: filters.region, category: filters.productCategory, salesperson: filters.salesperson,
      leadSource: filters.leadSource, paymentType: filters.paymentType, matchesPeriod: (date) => inPeriod(date, filters),
    });
    const combinedExclusions = dedupeExcluded([...soldExclusions, ...completedExclusions]);
    const bookedContext = revenueRows.map((row) => ({ ...row, recordType: 'Booked', contextual: true, contributionLabel: 'Booked value' }));
    const completedContext = completedRows.map((row) => ({ ...row, id: `${row.id}-completed`, recordType: 'Completed', contextual: true, contributionLabel: 'Completed value' }));
    base.value = id === METRIC_IDS.PRODUCTION_TO_SALES ? (capacity.soldValue ? capacity.productionToSalesRatio : null) : capacity.backlogMovement;
    base.supportingRecords = id === METRIC_IDS.BACKLOG_MOVEMENT
      ? [...bookedContext, ...completedContext.map((row) => ({ ...row, metricContribution: -row.metricContribution }))]
      : [...bookedContext, ...completedContext];
    base.excludedRecords = combinedExclusions;
    base.excludedRecordCount = combinedExclusions.length;
    base.contextRecordCount = base.supportingRecords.length;
    base.countSummary = `${plural(capacity.soldProjects, 'booked project')} · ${plural(capacity.completedProjects, 'completed project')} · ${plural(combinedExclusions.length, 'excluded project')}`;
    if (soldExclusions.length) base.warnings.push(`${plural(soldExclusions.length, 'booked project')} excluded from booked value because category allocation is unresolved.`);
    if (completedExclusions.length) base.warnings.push(`${plural(completedExclusions.length, 'completed project')} excluded from completed value because category allocation is unresolved.`);
    const bookedMonthly = sumByMonth(soldRevenue.included.map((item) => ({ date: item.date, value: item.revenue })));
    const completedMonthly = sumByMonth(completedRevenue.included.map((item) => ({ date: item.date, value: item.revenue })));
    base.timeSeries = [...new Set([...bookedMonthly.keys(), ...completedMonthly.keys()])].sort().map((period) => {
      const bookedValue = bookedMonthly.get(period) || 0;
      const completedValue = completedMonthly.get(period) || 0;
      return {
        period,
        bookedValue,
        completedValue,
        ratio: bookedValue ? completedValue / bookedValue : null,
        value: id === METRIC_IDS.BACKLOG_MOVEMENT ? bookedValue - completedValue : (bookedValue ? completedValue / bookedValue : null),
      };
    });
    if (id === METRIC_IDS.PRODUCTION_TO_SALES) {
      base.series = [
        { key: 'bookedValue', label: 'Booked', format: 'currency', color: '#2563eb' },
        { key: 'completedValue', label: 'Completed', format: 'currency', color: '#16a34a' },
        { key: 'ratio', label: 'Production / Sales', format: 'percentage', color: '#9333ea', line: true },
      ];
      base.breakdowns = {
        salesperson: ratioBreakdown(completedRows, revenueRows, 'salesperson', 'percentage'),
        region: ratioBreakdown(completedRows, revenueRows, 'region', 'percentage'),
      };
      base.breakdownLabels = { salesperson: 'By salesperson', region: 'By region' };
    } else {
      base.breakdowns = {
        salesperson: sumBreakdown(base.supportingRecords, 'salesperson', 'currency'),
        region: sumBreakdown(base.supportingRecords, 'region', 'currency'),
        paymentType: sumBreakdown(base.supportingRecords, 'paymentType', 'currency'),
      };
      base.breakdownLabels = { salesperson: 'By salesperson', region: 'By region', paymentType: 'By payment type' };
    }
    base._comparisonDataCount = capacity.soldProjects + capacity.completedProjects;
  }

  if (id === METRIC_IDS.COMPLETION_TO_PAYMENT) {
    const details = createCompletionPaymentDetails(projects, {
      region: filters.region, category: filters.productCategory, salesperson: filters.salesperson,
      leadSource: filters.leadSource, paymentType: filters.paymentType, matchesPeriod: (date) => inPeriod(date, filters),
    });
    const measuredRows = details.included.map((item) => projectRow(item.project, {
      metricContribution: item.days,
      contributionFormat: 'days',
      contributionLabel: 'Measured completion-to-payment days',
      scopeCategories: [...new Set((item.project.scopes || []).map((scope) => scope.type).filter(Boolean))],
    }));
    const excludedRows = details.excluded.map((item) => projectRow(item.project, {
      exclusionCode: item.reason,
      exclusionReason: paymentReasonLabels[item.reason] || item.reason,
      invalidIntervalDays: item.days,
    }));
    base.value = details.averageDays;
    base.supportingRecords = measuredRows;
    base.excludedRecords = excludedRows;
    base.includedRecordCount = measuredRows.length;
    base.excludedRecordCount = excludedRows.length;
    base.countSummary = `${plural(details.measuredProjectCount, 'measured project')} · ${plural(excludedRows.length, 'excluded project')}`;
    base.measuredProjectCount = details.measuredProjectCount;
    base.awaitingCollectionCount = details.awaitingCollectionCount;
    base.missingCollectionDateCount = details.missingCollectionDateCount;
    base.invalidCollectionDateCount = details.invalidCollectionDateCount;
    if (details.awaitingCollectionCount) base.warnings.push(`${plural(details.awaitingCollectionCount, 'completed project')} awaiting collection or funding.`);
    if (details.missingCollectionDateCount) base.warnings.push(`${plural(details.missingCollectionDateCount, 'collected/funded project')} excluded because its collection date is missing.`);
    if (details.invalidCollectionDateCount) base.warnings.push(`${plural(details.invalidCollectionDateCount, 'project')} excluded because collection predates final completion.`);
    base.timeSeries = averageSeries(details.included.map((item) => ({ date: item.completionDate, value: item.days })));
    base.breakdowns = {
      salesperson: averageBreakdown(measuredRows, 'salesperson', 'days'),
      region: averageBreakdown(measuredRows, 'region', 'days'),
      productCategory: paymentCategoryBreakdown(measuredRows),
      paymentType: averageBreakdown(measuredRows, 'paymentType', 'days'),
    };
    base.breakdownLabels = { salesperson: 'Average by salesperson', region: 'Average by region', productCategory: 'Average by product category', paymentType: 'Average by payment type' };
    base._comparisonDataCount = measuredRows.length;
  }

  if (id === METRIC_IDS.OPEN_BOTTLENECKS) {
    const alertRows = projects.filter((project) => projectMatches(project, filters) && inPeriod(project.dateSold, filters)).flatMap((project) => (
      getProjectAlerts(project).filter((alert) => !filters.productCategory || filters.productCategory === ALL || !alert.scope || alert.scope.type === filters.productCategory).map((alert, index) => projectRow(project, {
        id: `${project.id}-${alert.type}-${alert.scope?.id || 'project'}-${index}`,
        alertType: alert.type,
        daysStuck: alert.daysStuck,
        scopeCategory: alert.scope?.type || 'Project-level',
        measurer: alert.scope?.measurer || 'Unassigned',
        crew: alert.scope?.crew || 'Unassigned',
        metricContribution: 1,
        contributionFormat: 'count',
        contributionLabel: 'Current alert',
      }))
    ));
    base.value = alertRows.length;
    base.supportingRecords = alertRows;
    base.includedRecordCount = alertRows.length;
    base.countSummary = plural(alertRows.length, 'current alert');
    base.breakdowns = {
      alertType: sumBreakdown(alertRows, 'alertType'), salesperson: sumBreakdown(alertRows, 'salesperson'),
      region: sumBreakdown(alertRows, 'region'), scopeCategory: sumBreakdown(alertRows, 'scopeCategory'),
      measurer: sumBreakdown(alertRows, 'measurer'), crew: sumBreakdown(alertRows, 'crew'),
    };
    base.breakdownLabels = { alertType: 'By alert type', salesperson: 'By salesperson', region: 'By region', scopeCategory: 'By scope category', measurer: 'By measurer', crew: 'By crew' };
    base.timeSeries = [];
    base._comparisonDataCount = 0;
  }

  base.excludedRecords = dedupeExcluded(base.excludedRecords);
  base.excludedRecordCount = base.excludedRecords.length;
  return base;
};

export const createMetricResult = ({ id, projects = [], salesActivity = [], filters = {}, now = new Date() }) => {
  const result = baseResult(id, projects, salesActivity, filters);
  const comparison = id === METRIC_IDS.OPEN_BOTTLENECKS ? null : getComparisonPeriod(filters, now);
  const publicResult = ({ _comparisonDataCount, ...visible }) => visible;
  if (!comparison || result.value === null) return publicResult(result);
  const comparisonResult = baseResult(id, projects, salesActivity, comparison.comparisonFilters);
  if (!comparisonResult._comparisonDataCount || comparisonResult.value === null) return publicResult({ ...result, comparisonLabel: comparison.comparisonLabel });
  const comparisonAbsoluteChange = result.value - comparisonResult.value;
  const comparisonPercentChange = comparisonResult.value === 0 ? null : comparisonAbsoluteChange / Math.abs(comparisonResult.value);
  return publicResult({
    ...result,
    comparisonValue: comparisonResult.value,
    comparisonAbsoluteChange,
    comparisonPercentChange,
    comparisonChange: comparisonPercentChange,
    comparisonLabel: comparison.comparisonLabel,
  });
};
