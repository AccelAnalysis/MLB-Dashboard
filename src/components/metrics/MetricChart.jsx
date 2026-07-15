import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMetricValue } from '../../metrics/metricFormatting';

export default function MetricChart({ metric, breakdown = 'time' }) {
  const isTime = breakdown === 'time';
  const data = isTime ? metric.timeSeries : (metric.breakdowns?.[breakdown] || []);
  const dataKey = isTime ? 'period' : 'label';
  if (!data?.length) return <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Insufficient real history for this chart. Supporting records and formula details remain available below.</div>;
  return (
    <figure aria-label={`${metric.label} ${isTime ? 'over time' : `by ${breakdown}`} chart`} className="h-72 w-full min-w-0">
      <figcaption className="sr-only">{metric.label} {isTime ? 'trend over time' : `breakdown by ${breakdown}`}</figcaption>
      <ResponsiveContainer width="100%" height="100%">
        {isTime ? (
          <LineChart data={data} margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={dataKey} tick={{ fontSize: 12 }} /><YAxis tickFormatter={(value) => formatMetricValue(value, metric.format)} width={72} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatMetricValue(value, metric.format, false)} />
            <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 12, right: 18, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={dataKey} tick={{ fontSize: 11 }} interval={0} angle={data.length > 5 ? -20 : 0} textAnchor={data.length > 5 ? 'end' : 'middle'} height={data.length > 5 ? 55 : 30} />
            <YAxis tickFormatter={(value) => formatMetricValue(value, metric.format)} width={72} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatMetricValue(value, metric.format, false)} />
            <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </figure>
  );
}
