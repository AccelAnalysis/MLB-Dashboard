const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const normalizeProvider = (value) => {
  const provider = String(value || 'local').trim().toLowerCase();
  return provider === 'supabase' ? 'supabase' : 'local';
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const BACKEND_PROVIDER = normalizeProvider(env.VITE_DATA_PROVIDER);

export const SUPABASE_URL = String(env.VITE_SUPABASE_URL || '').trim();
export const SUPABASE_PUBLISHABLE_KEY = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();
export const ENABLE_REALTIME = parseBoolean(env.VITE_ENABLE_REALTIME, true);
export const SHARED_SYNC_DEBOUNCE_MS = parsePositiveInteger(env.VITE_SHARED_SYNC_DEBOUNCE_MS, 750);

export const isSupabaseConfigured = () => Boolean(
  BACKEND_PROVIDER === 'supabase'
  && SUPABASE_URL
  && SUPABASE_PUBLISHABLE_KEY,
);

export const isSharedBackendEnabled = () => BACKEND_PROVIDER === 'supabase' && isSupabaseConfigured();

export const getBackendConfiguration = () => ({
  provider: BACKEND_PROVIDER,
  supabaseConfigured: isSupabaseConfigured(),
  realtimeEnabled: ENABLE_REALTIME,
  syncDebounceMs: SHARED_SYNC_DEBOUNCE_MS,
});

export const assertBackendConfiguration = () => {
  if (BACKEND_PROVIDER !== 'supabase') return getBackendConfiguration();

  const missing = [];
  if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!SUPABASE_PUBLISHABLE_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');

  if (missing.length) {
    throw new Error(`Supabase is selected but required environment variables are missing: ${missing.join(', ')}`);
  }

  return getBackendConfiguration();
};
