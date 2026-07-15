import { CAPABILITY } from '../auth/permissions';
import { authorizeDataOperation, dispatchAuthorizationDenied } from '../auth/runtimeAuthorization';
import { isSharedBackendEnabled } from '../config/backendConfig';
import { getCurrentAuthContext } from './authService';
import { normalizeBackendError } from './backendErrors';
import { getSupabaseClient } from './supabaseClient';

export const SALES_ACTIVITY_STORAGE_KEY = 'mlb-dashboard-sales-activity-v1';

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
};
const clean = (value) => String(value ?? '').trim();
const todayISO = () => new Date().toISOString().slice(0, 10);

export const normalizeSalesActivityRecord = (record = {}) => ({
  id: clean(record.id) || `SA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  activityDate: clean(record.activityDate || record.activity_date) || todayISO(),
  salesperson: clean(record.salesperson),
  region: clean(record.region) || 'Virginia',
  leadSource: clean(record.leadSource || record.lead_source),
  category: clean(record.category) || 'All',
  leads: asNumber(record.leads),
  opportunities: asNumber(record.opportunities),
  createdAt: clean(record.createdAt || record.created_at) || new Date().toISOString(),
  updatedAt: clean(record.updatedAt || record.updated_at) || new Date().toISOString(),
});

export const normalizeSalesActivity = (records) => (
  Array.isArray(records)
    ? records.map(normalizeSalesActivityRecord).filter((record) => record.salesperson && record.activityDate)
    : []
);

export const loadSalesActivity = (fallback = []) => {
  try {
    const raw = localStorage.getItem(SALES_ACTIVITY_STORAGE_KEY);
    return raw ? normalizeSalesActivity(JSON.parse(raw)) : normalizeSalesActivity(fallback);
  } catch {
    return normalizeSalesActivity(fallback);
  }
};

export const saveSalesActivity = (records, options = {}) => {
  const normalized = normalizeSalesActivity(records);
  if (!options.force) {
    const authorization = authorizeDataOperation(CAPABILITY.MANAGE_SALES_DATA, 'change sales activity');
    if (!authorization.allowed) {
      dispatchAuthorizationDenied({ operation: 'saveSalesActivity', ...authorization });
      return false;
    }
  }

  localStorage.setItem(SALES_ACTIVITY_STORAGE_KEY, JSON.stringify(normalized));
  if (!options.force && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mlb-sales-activity-saved', {
      detail: { records: normalized, savedAt: new Date().toISOString() },
    }));
  }
  return true;
};

const fromRow = (row) => normalizeSalesActivityRecord(row);
const toRow = (record) => ({
  id: record.id,
  activity_date: record.activityDate,
  salesperson: record.salesperson,
  region: record.region,
  lead_source: record.leadSource,
  category: record.category,
  leads: record.leads,
  opportunities: record.opportunities,
  created_at: record.createdAt,
  updated_at: new Date().toISOString(),
});

const canManageSharedSales = async () => {
  const context = await getCurrentAuthContext();
  return Boolean(context?.accessState === 'active' && context.profile?.capabilities?.[CAPABILITY.MANAGE_SALES_DATA]);
};

export const loadSharedSalesActivity = async (fallback = []) => {
  const localRecords = normalizeSalesActivity(fallback);
  if (!isSharedBackendEnabled()) {
    return { available: false, usedRemote: false, reason: 'SHARED_BACKEND_DISABLED', records: localRecords };
  }

  try {
    const response = await getSupabaseClient().from('sales_activity').select('*').order('activity_date', { ascending: false });
    if (response.error) throw response.error;
    const records = normalizeSalesActivity((response.data || []).map(fromRow));
    return {
      available: true,
      usedRemote: records.length > 0,
      reason: records.length ? null : 'REMOTE_SALES_ACTIVITY_EMPTY',
      records: records.length ? records : localRecords,
    };
  } catch (error) {
    return {
      available: false,
      usedRemote: false,
      reason: 'SHARED_SALES_ACTIVITY_LOAD_FAILED',
      records: localRecords,
      error: normalizeBackendError(error, { operation: 'loadSharedSalesActivity', provider: 'supabase' }),
    };
  }
};

export const saveSharedSalesActivity = async (records = []) => {
  if (!isSharedBackendEnabled()) return { saved: false, reason: 'SHARED_BACKEND_DISABLED' };
  if (!(await canManageSharedSales())) return { saved: false, reason: 'ROLE_HAS_NO_SALES_WRITE_SCOPE' };

  const client = getSupabaseClient();
  const normalized = normalizeSalesActivity(records);
  try {
    const currentResponse = await client.from('sales_activity').select('id');
    if (currentResponse.error) throw currentResponse.error;
    const incomingIds = new Set(normalized.map((record) => record.id));
    const staleIds = (currentResponse.data || []).map((row) => row.id).filter((id) => !incomingIds.has(id));

    if (normalized.length) {
      const upsertResponse = await client.from('sales_activity').upsert(normalized.map(toRow), { onConflict: 'id' });
      if (upsertResponse.error) throw upsertResponse.error;
    }
    if (staleIds.length) {
      const deleteResponse = await client.from('sales_activity').delete().in('id', staleIds);
      if (deleteResponse.error) throw deleteResponse.error;
    }

    return { saved: true, reason: null, count: normalized.length };
  } catch (error) {
    return {
      saved: false,
      reason: 'SHARED_SALES_ACTIVITY_SAVE_FAILED',
      error: normalizeBackendError(error, { operation: 'saveSharedSalesActivity', provider: 'supabase' }),
    };
  }
};

export const subscribeToSharedSalesActivity = (onChange) => {
  if (!isSharedBackendEnabled() || typeof onChange !== 'function') return () => {};
  const client = getSupabaseClient();
  const channel = client
    .channel('mlb-dashboard-sales-activity')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_activity' }, onChange)
    .subscribe();
  return () => client.removeChannel(channel);
};
