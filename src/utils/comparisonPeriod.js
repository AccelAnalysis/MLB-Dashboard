const DAY_MS = 86400000;
const pad = (value) => String(value).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const atMidnight = (value) => {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const dayCount = (start, end) => Math.round((end - start) / DAY_MS) + 1;
const clampElapsedEnd = (start, elapsedDays, boundaryEnd) => {
  const candidate = addDays(start, elapsedDays);
  return candidate > boundaryEnd ? boundaryEnd : candidate;
};
const formatRange = (start, end) => {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
};

export const getComparisonPeriod = (filters, now = new Date()) => {
  const period = filters?.period || 'All';
  const today = atMidnight(now);
  let currentStart;
  let currentEnd;
  let comparisonStart;
  let comparisonEnd;
  let labelPrefix = 'Previous period';

  if (period === 'All') return null;
  if (period === 'Today') {
    currentStart = today;
    currentEnd = today;
    comparisonStart = addDays(today, -1);
    comparisonEnd = comparisonStart;
    labelPrefix = 'Previous day';
  } else if (period === 'WTD') {
    const mondayOffset = (today.getDay() + 6) % 7;
    currentStart = addDays(today, -mondayOffset);
    currentEnd = today;
    comparisonStart = addDays(currentStart, -7);
    comparisonEnd = addDays(comparisonStart, mondayOffset);
    labelPrefix = 'Previous week';
  } else if (period === 'MTD') {
    currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
    currentEnd = today;
    comparisonStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const comparisonBoundary = new Date(today.getFullYear(), today.getMonth(), 0);
    comparisonEnd = clampElapsedEnd(comparisonStart, today.getDate() - 1, comparisonBoundary);
    labelPrefix = 'Previous month';
  } else if (period === 'QTD') {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
    currentStart = new Date(today.getFullYear(), quarterStartMonth, 1);
    currentEnd = today;
    comparisonStart = new Date(today.getFullYear(), quarterStartMonth - 3, 1);
    const comparisonBoundary = new Date(comparisonStart.getFullYear(), comparisonStart.getMonth() + 3, 0);
    comparisonEnd = clampElapsedEnd(comparisonStart, dayCount(currentStart, today) - 1, comparisonBoundary);
    labelPrefix = 'Previous quarter';
  } else if (period === 'YTD') {
    currentStart = new Date(today.getFullYear(), 0, 1);
    currentEnd = today;
    comparisonStart = new Date(today.getFullYear() - 1, 0, 1);
    const priorMonthEnd = new Date(today.getFullYear() - 1, today.getMonth() + 1, 0).getDate();
    comparisonEnd = new Date(today.getFullYear() - 1, today.getMonth(), Math.min(today.getDate(), priorMonthEnd));
    labelPrefix = 'Previous year';
  } else if (period === 'Custom') {
    if (!filters.customStart || !filters.customEnd) return null;
    currentStart = atMidnight(filters.customStart);
    currentEnd = atMidnight(filters.customEnd);
    if (currentEnd < currentStart) return null;
    const length = dayCount(currentStart, currentEnd);
    comparisonEnd = addDays(currentStart, -1);
    comparisonStart = addDays(comparisonEnd, -(length - 1));
    labelPrefix = 'Previous equal period';
  } else {
    return null;
  }

  return {
    currentStart: toISO(currentStart),
    currentEnd: toISO(currentEnd),
    comparisonStart: toISO(comparisonStart),
    comparisonEnd: toISO(comparisonEnd),
    comparisonFilters: { ...filters, period: 'Custom', customStart: toISO(comparisonStart), customEnd: toISO(comparisonEnd) },
    comparisonLabel: `${labelPrefix}: ${formatRange(comparisonStart, comparisonEnd)}`,
  };
};
