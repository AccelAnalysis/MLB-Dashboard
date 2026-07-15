import { Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMetricValue } from '../../metrics/metricFormatting';

const DEFAULT_COLOR = '#2563eb';

export default function MetricChart({ metric, breakdown = 'time' }) {
  const isTime = breakdown === 'time';
  const data = isTime ? metric.timeSeries : (metric.breakdowns?.[breakdown] || []);
  const dataKey = isTime ? 'period' : 'label';
  const series = isTime && metric.series?.length
    ? metric.series
    : [{ key: 'value', label: metric.label, format: isTime ? metric.format : data?.[0]?.format || metric.format, color: DEFAULT_COLOR }];
  const seriesByKey = Object.fromEntries(series.map((item) => [item.key, item]));
  const tooltipFormatter = (value, key) => {
    const item = seriesByKey[key] || series[0];
    return [formatMetricValue(value, item.format || metric.format, false), item.label || metric.label];
  };
  if (!data?.length) return <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Insufficient real history for this chart. Supporting records and formula details remain available below.</div>;

  const common = <><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey={dataKey} tick={{ fontSize: 11 }} interval={0} angle={!isTime && data.length > 5 ? -20 : 0} textAnchor={!isTime && data.length > 5 ? 'end' : 'middle'} height={!isTime && data.length > 5 ? 55 : 30} /><YAxis yAxisId="primary" tickFormatter={(value) => formatMetricValue(value, series[0].format || metric.format)} width={72} tick={{ fontSize: 12 }} /><Tooltip formatter={tooltipFormatter} /></>;
  const margin = { top: 12, right: 18, left: 8, bottom: 8 };

  return (
    <figure aria-label={`${metric.label} ${isTime ? 'over time' : `by ${breakdown}`} chart`} className="h-72 w-full min-w-0">
      <figcaption className="sr-only">{metric.label} {isTime ? 'trend over time' : `breakdown by ${breakdown}`}</figcaption>
      <ResponsiveContainer width="100%" height="100%">
        {isTime && metric.timeSeriesType === 'groupedBar' ? (
          <ComposedChart data={data} margin={margin}>
            {common}
            <YAxis yAxisId="ratio" orientation="right" tickFormatter={(value) => formatMetricValue(value, 'percentage')} width={54} tick={{ fontSize: 12 }} />
            {series.map((item) => item.line
              ? <Line key={item.key} yAxisId="ratio" type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={3} dot={{ r: 3 }} />
              : <Bar key={item.key} yAxisId="primary" dataKey={item.key} name={item.label} fill={item.color} radius={[3, 3, 0, 0]} />)}
          </ComposedChart>
        ) : isTime && metric.timeSeriesType !== 'bar' ? (
          <LineChart data={data} margin={margin}>{common}<Line yAxisId="primary" type="monotone" dataKey="value" name={metric.label} stroke={DEFAULT_COLOR} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} /></LineChart>
        ) : (
          <BarChart data={data} margin={margin}>{common}<Bar yAxisId="primary" dataKey="value" name={metric.label} fill={DEFAULT_COLOR} radius={[4, 4, 0, 0]} /></BarChart>
        )}
      </ResponsiveContainer>
    </figure>
  );
}
