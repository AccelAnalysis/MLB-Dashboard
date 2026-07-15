import { formatMetricValue } from '../../metrics/metricFormatting';

const COLUMNS = [
  ['customer', 'Customer'], ['recordType', 'Type'], ['salesperson', 'Salesperson'], ['dateSold', 'Date sold'],
  ['activityDate', 'Activity date'], ['productCategory', 'Product'], ['leadSource', 'Lead source'],
  ['originalContract', 'Original contract'], ['revisedContract', 'Revised contract'], ['completionDate', 'Completion'],
  ['collectionDate', 'Collection'], ['leads', 'Leads'], ['alertType', 'Alert'], ['daysStuck', 'Days stuck'],
  ['metricContribution', 'Metric contribution'],
  ['exclusionReason', 'Exclusion reason'],
];
const currencyKeys = new Set(['originalContract', 'revisedContract']);

export default function MetricRecordTable({ metric, onOpenProject }) {
  const records = metric.supportingRecords || [];
  const columns = COLUMNS.filter(([key]) => records.some((record) => record[key] !== undefined && record[key] !== ''));
  if (!records.length) return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">No supporting records for the selected filters.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50"><tr>{columns.map(([key, label]) => <th key={key} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{label}</th>)}<th className="px-4 py-3"><span className="sr-only">Action</span></th></tr></thead>
        <tbody className="divide-y divide-slate-100 bg-white">{records.map((record, index) => <tr key={record.id || index}>{columns.map(([key]) => <td key={key} className="whitespace-nowrap px-4 py-3 text-slate-700">{key === 'metricContribution' ? <span title={record.contributionLabel}>{formatMetricValue(record[key], record.contributionFormat || metric.format, false)}</span> : currencyKeys.has(key) ? formatMetricValue(record[key], 'currency', false) : String(record[key] ?? '—')}</td>)}<td className="whitespace-nowrap px-4 py-3 text-right">{record.projectId && onOpenProject && <button type="button" onClick={() => onOpenProject(record.projectId)} className="font-bold text-blue-700 hover:underline">Open File</button>}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
