import { createEmptyProductionDataset } from '../../domain/productionDataset';
import { validateProductionDataset } from '../../domain/validation';
import { BackendError } from '../backendErrors';

export const LOCAL_PRODUCTION_DATASET_KEY = 'mlb-dashboard-production-dataset-v3';

export class LocalProductionRepository {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.provider = 'local';
  }

  async getSessionState() {
    return { authenticated: false, user: null };
  }

  async healthCheck() {
    const { dataset, validation } = await this.loadDataset();
    return {
      provider: this.provider,
      configured: true,
      authenticated: false,
      available: true,
      status: {
        schema: dataset.schema,
        modelVersion: dataset.modelVersion,
        counts: Object.fromEntries(
          Object.entries(dataset)
            .filter(([, value]) => Array.isArray(value))
            .map(([key, value]) => [key, value.length]),
        ),
        validation,
      },
    };
  }

  async loadDataset() {
    const raw = this.storage.getItem(LOCAL_PRODUCTION_DATASET_KEY);
    const dataset = raw ? JSON.parse(raw) : createEmptyProductionDataset();
    const validation = validateProductionDataset(dataset);

    if (!validation.valid) {
      throw new BackendError('The local production dataset is invalid.', {
        code: 'INVALID_LOCAL_DATASET',
        operation: 'loadDataset',
        provider: this.provider,
        recoverable: true,
        details: validation,
      });
    }

    return { dataset, validation };
  }

  async saveDataset(dataset) {
    const validation = validateProductionDataset(dataset);
    if (!validation.valid) {
      throw new BackendError('Refusing to save an invalid local production dataset.', {
        code: 'INVALID_DATASET',
        operation: 'saveDataset',
        provider: this.provider,
        recoverable: true,
        details: validation,
      });
    }

    this.storage.setItem(LOCAL_PRODUCTION_DATASET_KEY, JSON.stringify(dataset));
    window.dispatchEvent(new CustomEvent('mlb-production-dataset-saved', {
      detail: { provider: this.provider, savedAt: new Date().toISOString() },
    }));

    return {
      provider: this.provider,
      savedAt: new Date().toISOString(),
      validation,
      destructiveChangesApplied: false,
    };
  }

  async getDataQualityIssues() {
    const { validation } = await this.loadDataset();
    return [
      ...validation.errors.map((detail) => ({ issue_type: 'validation_error', severity: 'error', detail })),
      ...validation.warnings.map((detail) => ({ issue_type: 'validation_warning', severity: 'warning', detail })),
    ];
  }

  subscribe(onChange) {
    if (typeof onChange !== 'function') return () => {};

    const handleStorage = (event) => {
      if (event.key === LOCAL_PRODUCTION_DATASET_KEY) {
        onChange({ provider: this.provider, table: 'localStorage', payload: event.newValue });
      }
    };
    const handleCustom = (event) => onChange(event.detail || { provider: this.provider });

    window.addEventListener('storage', handleStorage);
    window.addEventListener('mlb-production-dataset-saved', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('mlb-production-dataset-saved', handleCustom);
    };
  }
}
