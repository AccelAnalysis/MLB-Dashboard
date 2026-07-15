import { getCategoryRevenue, getProjectCompletionDate } from '../utils/projectMetrics';
import { getProjectAlerts, getRevisedAmount } from '../utils/projectStatus';
import { isInPeriod } from '../utils/periodUtils';
import { daysBetween } from '../utils/dateUtils';

export const METRIC_IDS = {
  SALES_REVENUE: 'sales_revenue', PROJECTS_SOLD: 'projects_sold', AVERAGE_CONTRACT: 'average_contract',
  LEADS_GIVEN: 'leads_given', CLOSE_RATE: 'close_rate', VALUE_PER_LEAD: 'value_per_lead', CANCEL_RATE: 'cancel_rate',
  BOOKED_VALUE: 'booked_value', COMPLETED_VALUE: 'completed_value', PRODUCTION_TO_SALES: 'production_to_sales',
  BACKLOG_MOVEMENT: 'backlog_movement', COMPLETION_TO_PAYMENT: 'completion_to_payment', OPEN_BOTTLENECKS: 'open_bottlenecks',
};

export const metricRegistry = {
  sales_revenue: { label: 'Sales Revenue', description: 'Recognized revised contract value for non-cancelled projects sold in the selected period.', formula: 'Sum of Original Contract + approved Change Orders for included sold projects.', format: 'currency', dateBasis: 'Project Date Sold' },
  projects_sold: { label: 'Projects Sold', description: 'Non-cancelled Project Files sold in the selected period.', formula: 'Count of non-cancelled Project Files by Date Sold.', format: 'count', dateBasis: 'Project Date Sold' },
  average_contract: { label: 'Average Contract', description: 'Average recognized revised contract value per sold project.', formula: 'Recognized Sales Revenue ÷ Projects Sold.', format: 'currency', dateBasis: 'Project Date Sold' },
  leads_given: { label: 'Leads Given', description: 'Lead volume entered through dated Sales Activity records.', formula: 'Sum of Leads from Sales Activity.', format: 'count', dateBasis: 'Sales Activity Date' },
  close_rate: { label: 'Close Rate', description: 'Sold projects relative to recorded lead volume.', formula: 'Projects Sold ÷ Leads Given.', format: 'percentage', dateBasis: 'Project Date Sold and Sales Activity Date' },
  value_per_lead: { label: 'Value per Lead', description: 'Recognized sold revenue generated per recorded lead.', formula: 'Recognized Sales Revenue ÷ Leads Given.', format: 'currency', dateBasis: 'Project Date Sold and Sales Activity Date' },
  cancel_rate: { label: 'Cancel Rate', description: 'Cancelled sold projects as a share of all sold project files.', formula: 'Cancelled Projects ÷ (Non-cancelled Projects + Cancelled Projects).', format: 'percentage', dateBasis: 'Project Date Sold' },
  booked_value: { label: 'Booked in Period', description: 'Recognized revised contract value booked by Date Sold.', formula: 'Sum of recognized revised contract value for projects sold in period.', format: 'currency', dateBasis: 'Project Date Sold' },
  completed_value: { label: 'Completed in Period', description: 'Recognized project value whose final project completion occurred in the period.', formula: 'Sum of recognized revised contract value by final Project Completion Date.', format: 'currency', dateBasis: 'Final Project Completion Date' },
  production_to_sales: { label: 'Production / Sales', description: 'Completed value compared with booked value for the selected period.', formula: 'Completed in Period ÷ Booked in Period.', format: 'percentage', dateBasis: 'Date Sold and Final Project Completion Date' },
  backlog_movement: { label: 'Backlog Movement', description: 'Net booked value added to backlog after completed value.', formula: 'Booked in Period − Completed in Period.', format: 'currency', dateBasis: 'Date Sold and Final Project Completion Date' },
  completion_to_payment: { label: 'Complete to Payment', description: 'Average days from final project completion to collected or funded date.', formula: 'Average of Collected/Funded Date − Final Project Completion Date; missing dates excluded and reported.', format: 'days', dateBasis: 'Final Project Completion Date' },
  open_bottlenecks: { label: 'Open Alerts', description: 'Current project and scope alerts requiring operational attention.', formula: 'Count of alerts produced by the validated project alert rules.', format: 'count', dateBasis: 'Current operational state' },
};

const matchesCommon = (record, filters, categoryField = 'category') => (
  (!filters.region || filters.region === 'All' || record.region === filters.region)
  && (!filters.productCategory || filters.productCategory === 'All' || record[categoryField] === filters.productCategory)
  && (!filters.salesperson || filters.salesperson === 'All' || record.salesperson === filters.salesperson)
  && (!filters.leadSource || filters.leadSource === 'All' || record.leadSource === filters.leadSource)
  && (!filters.paymentType || filters.paymentType === 'All' || record.paymentType === filters.paymentType)
);
const inPeriod = (date, filters) => isInPeriod(date, filters.period || 'All', filters.customStart || '', filters.customEnd || '');
const projectMatches = (project, filters) => matchesCommon({ ...project, category: filters.productCategory }, filters) && (!filters.productCategory || filters.productCategory === 'All' || project.scopes?.some((scope) => scope.type === filters.productCategory));
const rowForProject = (project, extra = {}) => ({
  id: project.id, projectId: project.id, customer: project.customer, salesperson: project.salesperson || 'Unassigned',
  dateSold: project.dateSold, productCategory: (project.scopes || []).map((scope) => scope.type).join(', '),
  originalContract: Number(project.originalAmount || 0), revisedContract: getRevisedAmount(project),
  completionDate: getProjectCompletionDate(project), collectionDate: project.collectedDate || '',
  leadSource: project.leadSource || '', region: project.region || '', paymentType: project.paymentType || '', ...extra,
});
const monthKey = (date) => date?.slice(0, 7) || '';
const toSeries = (entries, format, aggregation = 'sum') => {
  const buckets = new Map();
  entries.filter((entry) => entry.date).forEach((entry) => {
    const key = monthKey(entry.date);
    const bucket = buckets.get(key) || { period: key, value: 0, valueCount: 0, numerator: 0, denominator: 0 };
    bucket.value += Number(entry.value || 0);
    if (entry.value !== null && entry.value !== undefined) bucket.valueCount += 1;
    bucket.numerator += Number(entry.numerator || 0);
    bucket.denominator += Number(entry.denominator || 0);
    buckets.set(key, bucket);
  });
  return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period)).map((bucket) => {
    if (aggregation === 'ratio' && !bucket.denominator) return null;
    return {
      period: bucket.period,
      value: aggregation === 'ratio'
        ? bucket.numerator / bucket.denominator
        : aggregation === 'average' && bucket.valueCount
          ? bucket.value / bucket.valueCount
          : bucket.value,
    };
  }).filter(Boolean);
};
const breakdown = (records, key, format, valueKey = 'metricValue') => {
  const grouped = new Map();
  records.forEach((record) => { const label = record[key] || 'Unassigned'; grouped.set(label, (grouped.get(label) || 0) + Number(record[valueKey] ?? 1)); });
  return [...grouped.entries()].map(([label, value]) => ({ label, value, format })).sort((a, b) => b.value - a.value);
};

export const createMetricResult = ({ id, projects = [], salesActivity = [], filters = {} }) => {
  const definition = metricRegistry[id];
  if (!definition) throw new Error(`Unknown metric ID: ${id}`);
  const category = filters.productCategory || 'All';
  const soldAll = projects.filter((project) => projectMatches(project, filters) && inPeriod(project.dateSold, filters));
  const sold = soldAll.filter((project) => !project.cancelled);
  const cancelled = soldAll.filter((project) => project.cancelled);
  const activity = salesActivity.filter((record) => matchesCommon(record, filters) && inPeriod(record.activityDate, filters));
  const recognized = [];
  const excluded = [];
  sold.forEach((project) => {
    const revenue = getCategoryRevenue(project, category);
    if (revenue.included) recognized.push(rowForProject(project, { metricValue: revenue.revenue }));
    else if (revenue.matched) excluded.push(rowForProject(project, { exclusionReason: revenue.reason }));
  });
  const salesRevenue = recognized.reduce((sum, row) => sum + row.metricValue, 0);
  const leads = activity.reduce((sum, row) => sum + Number(row.leads || 0), 0);
  const completed = projects.filter((project) => {
    const completionDate = getProjectCompletionDate(project);
    return completionDate && projectMatches(project, filters) && !project.cancelled && inPeriod(completionDate, filters);
  });
  const completedRows = [];
  completed.forEach((project) => { const revenue = getCategoryRevenue(project, category); if (revenue.included) completedRows.push(rowForProject(project, { metricValue: revenue.revenue })); else if (revenue.matched) excluded.push(rowForProject(project, { exclusionReason: revenue.reason })); });
  const completedValue = completedRows.reduce((sum, row) => sum + row.metricValue, 0);
  const activityRows = activity.map((record) => ({ id: record.id, salesperson: record.salesperson, leadSource: record.leadSource || '', region: record.region || '', productCategory: record.category || '', activityDate: record.activityDate, leads: Number(record.leads || 0), metricValue: Number(record.leads || 0) }));
  const paymentRows = completed.map((project) => rowForProject(project, { metricValue: project.collected && project.collectedDate ? daysBetween(project.collectedDate, getProjectCompletionDate(project)) : null, exclusionReason: !project.collected ? 'Awaiting collection' : !project.collectedDate ? 'Missing collection date' : '' }));
  const measuredPayments = paymentRows.filter((row) => row.metricValue !== null && row.metricValue >= 0);
  const alertRows = projects.filter((project) => projectMatches(project, filters) && inPeriod(project.dateSold, filters)).flatMap((project) => getProjectAlerts(project).map((alert, index) => rowForProject(project, { id: `${project.id}-${alert.type}-${index}`, alertType: alert.type, daysStuck: alert.daysStuck, metricValue: 1, scope: alert.scope?.type || '' })));
  let value = null;
  let supportingRecords = [];
  let seriesEntries = [];
  if ([METRIC_IDS.SALES_REVENUE, METRIC_IDS.BOOKED_VALUE].includes(id)) { value = salesRevenue; supportingRecords = recognized; seriesEntries = recognized.map((row) => ({ date: row.dateSold, value: row.metricValue })); }
  if (id === METRIC_IDS.PROJECTS_SOLD) { value = sold.length; supportingRecords = sold.map((project) => rowForProject(project, { metricValue: 1 })); seriesEntries = supportingRecords.map((row) => ({ date: row.dateSold, value: 1 })); }
  if (id === METRIC_IDS.AVERAGE_CONTRACT) { value = sold.length ? salesRevenue / sold.length : null; supportingRecords = recognized; seriesEntries = sold.map((project) => { const revenue = getCategoryRevenue(project, category); return { date: project.dateSold, value: revenue.included ? revenue.revenue : 0 }; }); }
  if (id === METRIC_IDS.LEADS_GIVEN) { value = leads; supportingRecords = activityRows; seriesEntries = activityRows.map((row) => ({ date: row.activityDate, value: row.leads })); }
  if (id === METRIC_IDS.CLOSE_RATE) { value = leads ? sold.length / leads : null; supportingRecords = [...sold.map((project) => rowForProject(project, { recordType: 'Sold project' })), ...activityRows.map((row) => ({ ...row, recordType: 'Lead activity' }))]; seriesEntries = [...sold.map((project) => ({ date: project.dateSold, numerator: 1 })), ...activityRows.map((row) => ({ date: row.activityDate, denominator: row.leads }))]; }
  if (id === METRIC_IDS.VALUE_PER_LEAD) { value = leads ? salesRevenue / leads : null; supportingRecords = [...recognized, ...activityRows]; seriesEntries = [...recognized.map((row) => ({ date: row.dateSold, numerator: row.metricValue })), ...activityRows.map((row) => ({ date: row.activityDate, denominator: row.leads }))]; }
  if (id === METRIC_IDS.CANCEL_RATE) { value = soldAll.length ? cancelled.length / soldAll.length : null; supportingRecords = soldAll.map((project) => rowForProject(project, { cancelled: project.cancelled, metricValue: project.cancelled ? 1 : 0 })); seriesEntries = soldAll.map((project) => ({ date: project.dateSold, numerator: project.cancelled ? 1 : 0, denominator: 1 })); }
  if (id === METRIC_IDS.COMPLETED_VALUE) { value = completedValue; supportingRecords = completedRows; seriesEntries = completedRows.map((row) => ({ date: row.completionDate, value: row.metricValue })); }
  if (id === METRIC_IDS.PRODUCTION_TO_SALES) { value = salesRevenue ? completedValue / salesRevenue : null; supportingRecords = [...recognized.map((row) => ({ ...row, recordType: 'Booked' })), ...completedRows.map((row) => ({ ...row, recordType: 'Completed' }))]; seriesEntries = []; }
  if (id === METRIC_IDS.BACKLOG_MOVEMENT) { value = salesRevenue - completedValue; supportingRecords = [...recognized.map((row) => ({ ...row, recordType: 'Booked', metricValue: row.metricValue })), ...completedRows.map((row) => ({ ...row, recordType: 'Completed', metricValue: -row.metricValue }))]; seriesEntries = supportingRecords.map((row) => ({ date: row.recordType === 'Booked' ? row.dateSold : row.completionDate, value: row.metricValue })); }
  if (id === METRIC_IDS.COMPLETION_TO_PAYMENT) { value = measuredPayments.length ? measuredPayments.reduce((sum, row) => sum + row.metricValue, 0) / measuredPayments.length : null; supportingRecords = paymentRows; seriesEntries = measuredPayments.map((row) => ({ date: row.completionDate, value: row.metricValue })); }
  if (id === METRIC_IDS.OPEN_BOTTLENECKS) { value = alertRows.length; supportingRecords = alertRows; seriesEntries = []; }
  const warnings = [];
  if (excluded.length) warnings.push(`${excluded.length} multi-scope project${excluded.length === 1 ? '' : 's'} excluded because category allocation is incomplete or unbalanced.`);
  if (id === METRIC_IDS.COMPLETION_TO_PAYMENT) { const missing = paymentRows.filter((row) => row.metricValue === null).length; if (missing) warnings.push(`${missing} completed project${missing === 1 ? '' : 's'} excluded because payment is open or its collection date is missing.`); }
  const format = definition.format;
  const seriesAggregation = [METRIC_IDS.CLOSE_RATE, METRIC_IDS.CANCEL_RATE, METRIC_IDS.VALUE_PER_LEAD].includes(id)
    ? 'ratio'
    : [METRIC_IDS.AVERAGE_CONTRACT, METRIC_IDS.COMPLETION_TO_PAYMENT].includes(id) ? 'average' : 'sum';
  const supportsAdditiveBreakdown = [
    METRIC_IDS.SALES_REVENUE, METRIC_IDS.PROJECTS_SOLD, METRIC_IDS.LEADS_GIVEN, METRIC_IDS.BOOKED_VALUE,
    METRIC_IDS.COMPLETED_VALUE, METRIC_IDS.BACKLOG_MOVEMENT, METRIC_IDS.OPEN_BOTTLENECKS,
  ].includes(id);
  return {
    id, ...definition, value, recordCount: supportingRecords.length, comparisonValue: null, comparisonChange: null,
    timeSeries: toSeries(seriesEntries, format, seriesAggregation),
    breakdowns: supportsAdditiveBreakdown ? {
      salesperson: breakdown(supportingRecords, 'salesperson', format), productCategory: breakdown(supportingRecords, 'productCategory', format),
      leadSource: breakdown(supportingRecords, 'leadSource', format), region: breakdown(supportingRecords, 'region', format), paymentType: breakdown(supportingRecords, 'paymentType', format),
    } : {},
    supportingRecords, excludedRecords: excluded, warnings,
  };
};
