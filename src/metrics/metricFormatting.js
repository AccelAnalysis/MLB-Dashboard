const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const exactNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export const formatMetricValue = (value, format = 'count', compact = true) => {
  if (typeof value === 'string' && value.trim() && Number.isNaN(Number(value))) return value;
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const number = Number(value);
  if (format === 'currency') return compact && Math.abs(number) >= 100000
    ? `$${compactNumber.format(number)}`
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(number);
  if (format === 'percentage') return `${Math.round(number * 100)}%`;
  if (format === 'days') return `${exactNumber.format(number)}d`;
  if (format === 'ratio') return exactNumber.format(number);
  return compact && Math.abs(number) >= 10000 ? compactNumber.format(number) : exactNumber.format(number);
};
