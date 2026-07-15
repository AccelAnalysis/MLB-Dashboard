export const PRODUCT_CATEGORIES = ['Roofs', 'Siding', 'Windows', 'Decks', 'Gutters', 'Doors', 'Trim', 'Repairs', 'Misc'];

export const TRADE_BOARD_COLUMNS = ['Roofs', 'Repairs', 'Siding', 'Trim', 'Gutters', 'Windows', 'Decks', 'Doors', 'Misc'];

export const REGIONS = ['All', 'Virginia', 'Carolina'];

export const MODAL_TAB_IDS = ['overview', 'scopes', 'financials', 'print'];

export const WALLBOARD_COLUMNS = [
  'Needs Measurer',
  'Measure / List Needed',
  'Ready to Order',
  'Ordered / Waiting Materials',
  'Materials In / Ready to Schedule',
  'Scheduled',
  'Collection / Closeout',
];

export const WHITEBOARD_STATUS_KEY = [
  { label: 'Measure date', field: 'measureCompleted', fallback: 'measureRequested', className: 'bg-purple-100 text-purple-800 border-purple-300' },
  { label: 'Order date', field: 'dateOrdered', className: 'bg-teal-100 text-teal-800 border-teal-300' },
  { label: 'Material ETA', field: 'materialETA', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  { label: 'Materials IN', field: 'materialsIn', className: 'bg-orange-100 text-orange-800 border-orange-300' },
  { label: 'Scheduled', field: 'scheduledInstallDate', className: 'bg-pink-100 text-pink-800 border-pink-300' },
];

export const UI_STORAGE_KEY = 'mlb-dashboard-ui-v1';
