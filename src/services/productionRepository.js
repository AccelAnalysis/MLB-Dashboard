import {
  BACKEND_PROVIDER,
  getBackendConfiguration,
  isSupabaseConfigured,
} from '../config/backendConfig';
import { LocalProductionRepository } from './repositories/localProductionRepository';
import { SupabaseProductionRepository } from './repositories/supabaseProductionRepository';

let repository = null;

export const getProductionRepository = () => {
  if (repository) return repository;

  repository = BACKEND_PROVIDER === 'supabase' && isSupabaseConfigured()
    ? new SupabaseProductionRepository()
    : new LocalProductionRepository();

  return repository;
};

export const getProductionRepositoryState = () => ({
  ...getBackendConfiguration(),
  activeProvider: getProductionRepository().provider,
});

export const resetProductionRepositoryForTests = () => {
  repository = null;
};
