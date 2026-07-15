import { PRODUCTION_STAGE, RECORD_STATUS } from './enums';

export const recordStatusForProductionStage = (productionStage, currentStatus = RECORD_STATUS.ACTIVE) => {
  if (currentStatus === RECORD_STATUS.ARCHIVED) return RECORD_STATUS.ARCHIVED;
  if (productionStage === PRODUCTION_STAGE.CANCELLED) return RECORD_STATUS.CANCELLED;
  if (productionStage === PRODUCTION_STAGE.CLOSED || productionStage === PRODUCTION_STAGE.COLLECTED) {
    return RECORD_STATUS.CLOSED;
  }
  if (productionStage === PRODUCTION_STAGE.COMPLETED || productionStage === PRODUCTION_STAGE.FUNDING_PENDING) {
    return RECORD_STATUS.COMPLETED;
  }
  return RECORD_STATUS.ACTIVE;
};

const normalizeRecord = (record) => ({
  ...record,
  recordStatus: recordStatusForProductionStage(record.productionStage, record.recordStatus),
});

export const normalizeOperationalRecordStatuses = (dataset = {}) => ({
  ...dataset,
  jobs: Array.isArray(dataset.jobs) ? dataset.jobs.map(normalizeRecord) : [],
  workScopes: Array.isArray(dataset.workScopes) ? dataset.workScopes.map(normalizeRecord) : [],
});
