import { getBackendConfiguration } from '../config/backendConfig';
import { validateProductionDataset } from '../domain/validation';
import { loadProjects } from './projectStorage';
import { getProductionRepository } from './productionRepository';
import { bootstrapSharedBackend } from './sharedProjectStorage';

const downloadJson = (filename, value) => {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const getBackendAdminSnapshot = async () => {
  const repository = getProductionRepository();
  const configuration = getBackendConfiguration();

  try {
    const health = await repository.healthCheck();
    const qualityIssues = health.available
      ? await repository.getDataQualityIssues()
      : [];

    return {
      configuration,
      provider: repository.provider,
      health,
      qualityIssues,
      error: null,
    };
  } catch (error) {
    return {
      configuration,
      provider: repository.provider,
      health: null,
      qualityIssues: [],
      error,
    };
  }
};

export const bootstrapSharedBackendFromCurrentCache = async ({ allowExisting = false } = {}) => {
  const repository = getProductionRepository();
  const health = await repository.healthCheck();

  if (!health.available) {
    return { bootstrapped: false, reason: health.reason || 'BACKEND_UNAVAILABLE', health };
  }

  const existing = await repository.loadDataset();
  if (existing.dataset.jobs.length && !allowExisting) {
    return {
      bootstrapped: false,
      reason: 'REMOTE_DATASET_NOT_EMPTY',
      existingJobCount: existing.dataset.jobs.length,
    };
  }

  const result = await bootstrapSharedBackend(loadProjects());
  return { bootstrapped: Boolean(result.saved), ...result };
};

export const exportSharedBackendDataset = async () => {
  const repository = getProductionRepository();
  const { dataset, validation } = await repository.loadDataset();
  const checked = validateProductionDataset(dataset);

  if (!checked.valid) {
    throw new Error('The shared production dataset failed validation and was not exported.');
  }

  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`mlb-dashboard-production-backup-${date}.json`, dataset);
  return { exported: true, validation };
};
