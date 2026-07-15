import { formatDate } from './dateUtils';

export const PERIODS = ['Today', 'WTD', 'MTD', 'QTD', 'YTD', 'All', 'Custom'];

export const getPeriodLabel = (period, customStart, customEnd) => {
  if (period !== 'Custom') return period;
  if (customStart && customEnd) return `Custom: ${formatDate(customStart)} - ${formatDate(customEnd)}`;
  if (customStart) return `Custom: Since ${formatDate(customStart)}`;
  if (customEnd) return `Custom: Through ${formatDate(customEnd)}`;
  return 'Custom: All dates';
};

export const isInPeriod = (dateStr, period, customStart = '', customEnd = '') => {
  if (period === 'All' || !dateStr) return true;

  const date = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
  const mondayOffset = (now.getDay() + 6) % 7;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);

  if (period === 'Today') return date.getTime() === today.getTime();
  if (period === 'WTD') return date >= weekStart && date <= today;
  if (period === 'MTD') return date >= monthStart && date <= today;
  if (period === 'QTD') return date >= quarterStart && date <= today;
  if (period === 'YTD') return date >= yearStart && date <= today;

  if (period === 'Custom') {
    const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
    const end = customEnd ? new Date(`${customEnd}T00:00:00`) : null;
    return (!start || date >= start) && (!end || date <= end);
  }

  return true;
};
