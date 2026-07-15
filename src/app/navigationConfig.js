export const VIEWS = {
  CENTER: 'center',
  MEASURE: 'measure',
  BOTTLENECKS: 'bottlenecks',
  SALES: 'sales',
  CRITICAL: 'critical',
  BOOK: 'book',
  WALLBOARD: 'wallboard',
};

export const MAIN_AREAS = {
  PRODUCTION: 'production',
  BOTTLENECKS: 'bottlenecks',
  SALES: 'sales',
  WALLBOARD: 'wallboard',
};

export const PRODUCTION_MODES = {
  CUSTOMER: 'customer',
  BOOK: 'book',
  MEETING: 'meeting',
};

export const BOTTLENECK_MODES = {
  ALL: 'all',
  MEASUREMENT: 'measurement',
};

export const MAIN_NAV_ITEMS = [
  { id: MAIN_AREAS.PRODUCTION, label: 'Production' },
  { id: MAIN_AREAS.BOTTLENECKS, label: 'Bottlenecks' },
  { id: MAIN_AREAS.SALES, label: 'Sales' },
  { id: MAIN_AREAS.WALLBOARD, label: 'TV Wallboard' },
];

export const PRODUCTION_NAV_ITEMS = [
  { id: PRODUCTION_MODES.CUSTOMER, label: 'Customer' },
  { id: PRODUCTION_MODES.BOOK, label: 'Book' },
  { id: PRODUCTION_MODES.MEETING, label: 'Meeting' },
];

export const BOTTLENECK_NAV_ITEMS = [
  { id: BOTTLENECK_MODES.ALL, label: 'All' },
  { id: BOTTLENECK_MODES.MEASUREMENT, label: 'Measurement' },
];

export const VIEW_QUERY_MAP = {
  wallboard: VIEWS.WALLBOARD,
  book: VIEWS.BOOK,
  sales: VIEWS.SALES,
  bottlenecks: VIEWS.BOTTLENECKS,
  center: VIEWS.CENTER,
  measure: VIEWS.MEASURE,
  critical: VIEWS.CRITICAL,
};
