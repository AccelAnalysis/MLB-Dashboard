import { createClient } from '@supabase/supabase-js';
import {
  assertBackendConfiguration,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '../config/backendConfig';
import { BackendError } from './backendErrors';

let client = null;

export const getSupabaseClient = () => {
  if (client) return client;

  try {
    assertBackendConfiguration();
  } catch (error) {
    throw new BackendError(error.message, {
      code: 'BACKEND_CONFIGURATION_ERROR',
      operation: 'createClient',
      provider: 'supabase',
      recoverable: true,
      cause: error,
    });
  }

  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-application-name': 'mlb-dashboard',
      },
    },
  });

  return client;
};

export const clearSupabaseClientForTests = () => {
  client = null;
};
