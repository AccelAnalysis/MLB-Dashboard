import { ENABLE_REALTIME } from '../../config/backendConfig';
import { createEmptyProductionDataset } from '../../domain/productionDataset';
import { validateProductionDataset } from '../../domain/validation';
import { BackendError, normalizeBackendError } from '../backendErrors';
import { getSupabaseClient } from '../supabaseClient';
import { SUPABASE_COLLECTIONS, SUPABASE_SAVE_ORDER } from './supabaseMappers';

const APPEND_ONLY_COLLECTIONS = new Set(['statusEvents', 'activityLogs']);

const ensureNoError = (response, operation) => {
  if (!response?.error) return response?.data;
  throw normalizeBackendError(response.error, {
    code: 'SUPABASE_OPERATION_FAILED',
    operation,
    provider: 'supabase',
  });
};

const stableSerialize = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export class SupabaseProductionRepository {
  constructor(client = getSupabaseClient()) {
    this.client = client;
    this.provider = 'supabase';
  }

  async getSessionState() {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw normalizeBackendError(error, {
        code: 'SUPABASE_SESSION_FAILED',
        operation: 'getSession',
        provider: this.provider,
      });
    }

    return {
      authenticated: Boolean(data?.session?.user),
      user: data?.session?.user || null,
    };
  }

  async healthCheck() {
    const session = await this.getSessionState();
    if (!session.authenticated) {
      return {
        provider: this.provider,
        configured: true,
        authenticated: false,
        available: false,
        reason: 'AUTHENTICATION_REQUIRED',
      };
    }

    const response = await this.client.rpc('get_backend_status');
    const status = ensureNoError(response, 'get_backend_status');

    return {
      provider: this.provider,
      configured: true,
      authenticated: true,
      available: true,
      status,
    };
  }

  async loadDataset() {
    const dataset = createEmptyProductionDataset();

    const entries = await Promise.all(
      Object.entries(SUPABASE_COLLECTIONS).map(async ([collection, definition]) => {
        const response = await this.client
          .from(definition.table)
          .select('*')
          .order('created_at', { ascending: true });

        const rows = ensureNoError(response, `load:${definition.table}`) || [];
        return [collection, rows.map(definition.fromRow)];
      }),
    );

    entries.forEach(([collection, records]) => {
      dataset[collection] = records;
    });

    const validation = validateProductionDataset(dataset);
    if (!validation.valid) {
      throw new BackendError('The shared database returned an invalid production dataset.', {
        code: 'INVALID_SHARED_DATASET',
        operation: 'loadDataset',
        provider: this.provider,
        recoverable: false,
        details: validation,
      });
    }

    return { dataset, validation };
  }

  async getChangedRecords(collection, definition, records, precise) {
    if (!precise || !records.length) return records;

    const response = await this.client
      .from(definition.table)
      .select('*')
      .in('id', records.map((record) => record.id));
    const currentRows = ensureNoError(response, `compare:${definition.table}`) || [];
    const currentById = new Map(
      currentRows.map((row) => {
        const record = definition.fromRow(row);
        return [record.id, record];
      }),
    );

    return records.filter((record) => {
      const current = currentById.get(record.id);
      return !current || stableSerialize(record) !== stableSerialize(current);
    });
  }

  async saveDataset(dataset, options = {}) {
    const validation = validateProductionDataset(dataset);
    if (!validation.valid) {
      throw new BackendError('Refusing to save an invalid production dataset.', {
        code: 'INVALID_DATASET',
        operation: 'saveDataset',
        provider: this.provider,
        recoverable: true,
        details: validation,
      });
    }

    const requestedCollections = Array.isArray(options.collections)
      ? new Set(options.collections)
      : null;
    const saveOrder = requestedCollections
      ? SUPABASE_SAVE_ORDER.filter((collection) => requestedCollections.has(collection))
      : SUPABASE_SAVE_ORDER;
    const counts = {};
    const submittedCounts = {};

    for (const collection of saveOrder) {
      const allRecords = Array.isArray(dataset[collection]) ? dataset[collection] : [];
      counts[collection] = allRecords.length;
      if (!allRecords.length) {
        submittedCounts[collection] = 0;
        continue;
      }

      const definition = SUPABASE_COLLECTIONS[collection];
      if (!definition) {
        throw new BackendError(`Unknown production collection: ${collection}`, {
          code: 'UNKNOWN_COLLECTION',
          operation: 'saveDataset',
          provider: this.provider,
          recoverable: false,
        });
      }

      const records = await this.getChangedRecords(
        collection,
        definition,
        allRecords,
        Boolean(requestedCollections),
      );
      submittedCounts[collection] = records.length;
      if (!records.length) continue;

      const rows = records.map((record) => definition.toRow({
        ...record,
        syncState: options.syncState || 'synced',
      }));

      const response = await this.client
        .from(definition.table)
        .upsert(rows, {
          onConflict: 'id',
          ignoreDuplicates: APPEND_ONLY_COLLECTIONS.has(collection),
        });

      ensureNoError(response, `save:${definition.table}`);
    }

    return {
      provider: this.provider,
      savedAt: new Date().toISOString(),
      counts,
      submittedCounts,
      collections: saveOrder,
      validation,
      destructiveChangesApplied: false,
    };
  }

  async getDataQualityIssues() {
    const response = await this.client
      .from('v_data_quality_issues')
      .select('*')
      .order('severity', { ascending: false });

    return ensureNoError(response, 'load:v_data_quality_issues') || [];
  }

  subscribe(onChange) {
    if (!ENABLE_REALTIME || typeof onChange !== 'function') return () => {};

    const tables = ['customers', 'leads', 'jobs', 'work_scopes', 'change_orders'];
    let channel = this.client.channel('mlb-dashboard-shared-data');

    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => onChange({ provider: this.provider, table, payload }),
      );
    });

    channel.subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }
}
