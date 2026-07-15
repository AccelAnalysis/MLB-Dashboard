import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { PERIODS, getPeriodLabel } from '../../utils/periodUtils';
import { formatMetricValue } from '../../metrics/metricFormatting';
import MetricChart from './MetricChart';
import MetricRecordTable from './MetricRecordTable';

const BREAKDOWN_LABELS = { time: 'Over time', salesperson: 'By salesperson', productCategory: 'By product category', leadSource: 'By lead source', region: 'By region', paymentType: 'By payment type' };

export default function MetricDrilldownModal({ metricId, workspaceFilters, buildMetric, onClose, onOpenProject, returnFocusRef }) {
  const [localFilters, setLocalFilters] = useState(workspaceFilters);
  const [breakdown, setBreakdown] = useState('time');
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const metric = useMemo(() => buildMetric(metricId, localFilters), [buildMetric, metricId, localFilters]);
  const differs = localFilters.period !== workspaceFilters.period || localFilters.customStart !== workspaceFilters.customStart || localFilters.customEnd !== workspaceFilters.customEnd;
  const breakdowns = ['time', ...Object.entries(metric.breakdowns || {}).filter(([, values]) => values?.length).map(([key]) => key)];

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex="0"]')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const focusTarget = returnFocusRef?.current || previous;
      const focusLabel = focusTarget?.getAttribute?.('aria-label');
      window.setTimeout(() => {
        const currentTarget = focusTarget?.isConnected
          ? focusTarget
          : [...document.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === focusLabel);
        (currentTarget || previous)?.focus?.();
      }, 0);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="metric-dialog-title" className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-blue-700">Metric drilldown</p><h2 id="metric-dialog-title" className="mt-1 text-2xl font-black text-slate-950">{metric.label}</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">{metric.description}</p></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close metric drilldown" className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><X /></button>
        </header>
        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current value</p><p className="mt-1 text-4xl font-black tabular-nums text-slate-950" title={formatMetricValue(metric.value, metric.format, false)}>{formatMetricValue(metric.value, metric.format)}</p><p className="mt-2 text-sm text-slate-500">Workspace: {Object.entries(workspaceFilters).filter(([, value]) => value && value !== 'All').map(([key, value]) => `${key}: ${value}`).join(' · ') || 'All records'}</p></div>
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="text-xs font-bold uppercase text-slate-500">Drilldown period<select value={localFilters.period} onChange={(event) => setLocalFilters((current) => ({ ...current, period: event.target.value }))} className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-800">{PERIODS.map((period) => <option key={period}>{period}</option>)}</select></label>
              {localFilters.period === 'Custom' && <><label className="text-xs font-bold uppercase text-slate-500">Start<input type="date" value={localFilters.customStart || ''} onChange={(event) => setLocalFilters((current) => ({ ...current, customStart: event.target.value }))} className="mt-1 block rounded border border-slate-300 bg-white px-2 py-2 text-sm normal-case" /></label><label className="text-xs font-bold uppercase text-slate-500">End<input type="date" value={localFilters.customEnd || ''} onChange={(event) => setLocalFilters((current) => ({ ...current, customEnd: event.target.value }))} className="mt-1 block rounded border border-slate-300 bg-white px-2 py-2 text-sm normal-case" /></label></>}
              {differs && <button type="button" onClick={() => setLocalFilters(workspaceFilters)} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-blue-700"><RotateCcw size={14} className="mr-1 inline" />Reset to Workspace Filters</button>}
            </div>
          </div>
          {differs && <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">Drilldown period differs from workspace: {getPeriodLabel(localFilters.period, localFilters.customStart, localFilters.customEnd)}</p>}
          <section className="mt-6 rounded-lg border border-slate-200 p-4" aria-labelledby="chart-heading"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 id="chart-heading" className="font-black text-slate-900">Metric chart</h3><label className="text-xs font-bold uppercase text-slate-500">Breakdown<select value={breakdown} onChange={(event) => setBreakdown(event.target.value)} className="ml-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-800">{breakdowns.map((key) => <option key={key} value={key}>{BREAKDOWN_LABELS[key]}</option>)}</select></label></div><MetricChart metric={metric} breakdown={breakdown} /></section>
          <section className="mt-6" aria-labelledby="records-heading"><div className="mb-3 flex items-baseline justify-between gap-3"><h3 id="records-heading" className="font-black text-slate-900">Supporting records</h3><span className="text-sm text-slate-500">{metric.recordCount} included</span></div><MetricRecordTable metric={metric} onOpenProject={onOpenProject} />{metric.excludedRecords.length > 0 && <div className="mt-4"><h4 className="mb-2 font-bold text-amber-900">Excluded records</h4><MetricRecordTable metric={{ ...metric, supportingRecords: metric.excludedRecords }} onOpenProject={onOpenProject} /></div>}</section>
          <section className="mt-6 grid gap-4 lg:grid-cols-2"><div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-slate-900">Formula and date basis</h3><p className="mt-2 text-sm text-slate-700">{metric.formula}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">{metric.dateBasis}</p></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-slate-900">Data quality</h3><p className="mt-2 text-sm text-slate-700">{metric.recordCount} supporting records · {metric.excludedRecords.length} excluded records</p>{metric.warnings.length ? <ul className="mt-2 space-y-2">{metric.warnings.map((warning) => <li key={warning} className="flex gap-2 text-sm font-semibold text-amber-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{warning}</li>)}</ul> : <p className="mt-2 text-sm text-green-700">No data-quality warnings for this result.</p>}</div></section>
        </div>
      </section>
    </div>
  );
}
