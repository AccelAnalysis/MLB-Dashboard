const MS_PER_DAY = 86400000;

export const toISODate = (date) => date.toISOString().split('T')[0];

export const todayISO = () => toISODate(new Date());

export const daysAgo = (days) => toISODate(new Date(Date.now() - days * MS_PER_DAY));

export const daysFromNow = (days) => toISODate(new Date(Date.now() + days * MS_PER_DAY));

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${dateStr}T00:00:00`));
};

export const daysBetween = (newerDate, olderDate) => {
  if (!newerDate || !olderDate) return 0;
  return Math.floor((new Date(`${newerDate}T00:00:00`) - new Date(`${olderDate}T00:00:00`)) / MS_PER_DAY);
};
