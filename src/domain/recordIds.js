const PREFIXES = Object.freeze({
  customer: 'CUS',
  job: 'JOB',
  workScope: 'SCP',
  lead: 'LED',
  changeOrder: 'CO',
  statusEvent: 'EVT',
  activity: 'ACT',
  user: 'USR',
  teamMember: 'TMB',
  crew: 'CRW',
  importRun: 'IMP',
});

const randomSegment = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/**
 * Creates a client-safe identifier for prototype and import workflows.
 * A production backend may replace this with UUIDs while preserving the
 * entity prefix for supportability and human-readable exports.
 */
export const createRecordId = (entityType, now = Date.now()) => {
  const prefix = PREFIXES[entityType];
  if (!prefix) throw new Error(`Unsupported record type: ${entityType}`);
  return `${prefix}-${Number(now).toString(36).toUpperCase()}-${randomSegment()}`;
};

export const isRecordId = (value, entityType) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  const prefix = PREFIXES[entityType];
  return Boolean(prefix && value.startsWith(`${prefix}-`));
};

export const RECORD_ID_PREFIXES = PREFIXES;
