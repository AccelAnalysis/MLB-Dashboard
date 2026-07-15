import { ArrowDownRight, ArrowUpRight, BarChart3 } from 'lucide-react';
import { formatMetricValue, getComparisonPresentation } from '../../metrics/metricFormatting';

const exactNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const exactCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const exactMetricValue = (value, format) => {
  if (typeof value === 'string' && value.trim() && Number.isNaN(Number(value))) return value;
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'Unavailable';
  if (format === 'currency') return exactCurrency.format(Number(value));
  if (format === 'percentage') return `${(Number(value) * 100).toFixed(1)}%`;
  if (format === 'days') return `${exactNumber.format(Number(value))} days`;
  return exactNumber.format(Number(value));
};

export default function MetricCard({
  metric,
  label = metric?.label,
  value = metric?.value,
  displayValue,
  format = metric?.format || 'count',
  detail,
  tone = 'default',
  helpId,
  helpIcon,
  onClick,
  ariaLabel,
  loading = false,
  unavailable = false,
  comparisonChange = metric?.comparisonChange,
}) {
  const interactive = typeof onClick === 'function';
  const resolvedUnavailable = unavailable || value === null || value === undefined;
  const shownValue = loading ? 'Loading…' : resolvedUnavailable ? '—' : (displayValue ?? formatMetricValue(value, format));
  const exactValue = exactMetricValue(value, format);
  const comparison = getComparisonPresentation(metric || { comparisonChange, format });
  const toneClasses = {
    default: 'border-slate-200 bg-white',
    warning: 'border-amber-200 bg-amber-50',
    success: 'border-green-200 bg-green-50',
    danger: 'border-red-200 bg-red-50',
  };
  const legacyTone = tone.includes?.('bg-') ? tone : toneClasses[tone] || toneClasses.default;
  const content = (
    <>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {interactive && <BarChart3 size={17} className="shrink-0 text-blue-600" aria-hidden="true" />}
      </div>
      <div className="mt-2 flex min-w-0 items-baseline gap-2">
        <span
          className="min-w-0 truncate font-black leading-none tracking-tight text-slate-950 [font-size:clamp(1.45rem,2.4vw,2.25rem)] [font-variant-numeric:tabular-nums]"
          title={exactValue}
          aria-label={`${label}: ${exactValue}`}
        >
          {shownValue}
        </span>
        {!interactive && helpIcon}
      </div>
      {comparison && (
        <p className={`mt-2 flex items-center text-xs font-bold ${comparison.sentiment === 'favorable' ? 'text-green-700' : comparison.sentiment === 'unfavorable' ? 'text-red-700' : 'text-slate-600'}`}>
          {comparison.direction === 'down' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          {comparison.changeText} vs {comparison.label}
        </p>
      )}
      {(detail || resolvedUnavailable) && <p className="mt-1 text-sm text-slate-500">{resolvedUnavailable ? 'Unavailable for the selected filters' : detail}</p>}
    </>
  );

  const className = `min-w-0 w-full rounded-lg border p-5 text-left shadow-sm ${legacyTone} ${interactive ? 'cursor-pointer transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2' : ''}`;
  if (interactive) {
    return <div className="relative min-w-0"><button type="button" data-help-id={helpId} onClick={(event) => onClick(event.currentTarget)} aria-label={ariaLabel || `Open ${label} drilldown`} className={className}>{content}</button>{helpIcon && <span className="absolute bottom-3 right-3">{helpIcon}</span>}</div>;
  }
  return <article data-help-id={helpId} className={className}>{content}</article>;
}
