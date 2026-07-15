export const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const percent = (value, digits = 0) =>
  `${((Number(value) || 0) * 100).toFixed(digits)}%`;
