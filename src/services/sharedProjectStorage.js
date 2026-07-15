import {
  SHARED_SYNC_DEBOUNCE_MS,
  isSharedBackendEnabled,
} from '../config/backendConfig';
import { convertLegacyProjectsToProduction } from '../domain/legacyToProduction';
import { normalizeLegacyProjects } from '../domain/legacyProjectAdapter';
import { convertProductionToLegacyProjects } from '../domain/productionToLegacy';
import { getCurrentAuthContext } from './authService';
import { normalizeBackendError } from './backendErrors';
import { getProductionRepository } from './productionRepository';

const jobLegacyId = (job) => {
  const externalIds = job.externalIds || {};
  if (externalIds.legacyProjectId) return String(externalIds.legacyProjectId);
  const source = String(externalIds.legacyDashboard || job.id || '');
  return source.startsWith('JOB-LEGACY-') ? source.slice('JOB-LEGACY-'.length) : source;
};

const preserveLegacyCompatibilityFields = (dataset, projects) => {
  const projectById = new Map(projects.map((project) => [String(project.id), project]));
  dataset.jobs = dataset.jobs.map((job) => ({
    ...job,
    thankYouSent: Boolean(projectById.get(jobLegacyId(job))?.thankYouSent),
  }));
  return dataset;
};

const getAuthorizedCollections = (capabilities = {}) => {
  if (capabilities.legacyFullWrite) {
    return ['teamMembers', 'crews', 'customers', 'leads', 'jobs', 'workScopes', 'changeOrders'];
  }

  const collections = new Set();
  if (capabilities.manageSalesData) {
    collections.add('teamMembers');
    collections.add('customers');
    collections.add('leads');
    collections.add('jobs');
  }
  if (capabilities.manageProductionData) {
    collections.add('teamMembers');
    collections.add('crews');
    collections.add('jobs');
    collections.add('workScopes');
  }
  if (capabilities.manageFinancialData) {
    collections.add('jobs');
    collections.add('changeOrders');
  }
  return [...collections];
};

const getWriteAuthorization = async () => {
  const context = await getCurrentAuthContext();
  const collections = getAuthorizedCollections(context?.profile?.capabilities || {});
  return {
    context,
    collections,
    allowed: Boolean(context?.accessState === 'active' && collections.length),
  };
};

export const isSharedProjectBackendEnabled = () => isSharedBackendEnabled();
export const getSharedSyncDebounceMs = () => SHARED_SYNC_DEBOUNCE_MS;

export const loadSharedProjects = async (fallbackProjects = []) => {
  const fallback = normalizeLegacyProjects(fallbackProjects);

  if (!isSharedBackendEnabled()) {
    return {
      available: false,
      usedRemote: false,
      reason: 'SHARED_BACKEND_DISABLED',
      projects: fallback,
      status: null,
    };
  }

  const repository = getProductionRepository();

  try {
    const health = await repository.healthCheck();
    if (!health.available) {
      return {
        available: false,
        usedRemote: false,
        reason: health.reason || 'SHARED_BACKEND_UNAVAILABLE',
        projects: fallback,
        status: health,
      };
    }

    const { dataset, validation } = await repository.loadDataset();
    if (!dataset.jobs.length) {
      return {
        available: true,
        usedRemote: false,
        reason: 'REMOTE_DATASET_EMPTY',
        projects: fallback,
        status: health,
        validation,
      };
    }

    return {
      available: true,
      usedRemote: true,
      reason: null,
      projects: convertProductionToLegacyProjects(dataset),
      status: health,
      validation,
    };
  } catch (error) {
    return {
      available: false,
      usedRemote: false,
      reason: 'SHARED_BACKEND_LOAD_FAILED',
      projects: fallback,
      status: null,
      error: normalizeBackendError(error, {
        operation: 'loadSharedProjects',
        provider: repository.provider,
      }),
    };
  }
};

export const saveSharedProjects = async (projects = [], options = {}) => {
  if (!isSharedBackendEnabled()) {
    return { saved: false, reason: 'SHARED_BACKEND_DISABLED' };
  }

  const authorization = await getWriteAuthorization();
  const requestedCollections = Array.isArray(options.collections)
    ? options.collections.filter((collection) => authorization.collections.includes(collection))
    : authorization.collections;

  if (!authorization.allowed || !requestedCollections.length) {
    return {
      saved: false,
      reason: authorization.context?.accessState === 'active'
        ? 'ROLE_HAS_NO_SHARED_WRITE_SCOPE'
        : 'AUTHENTICATION_REQUIRED',
      role: authorization.context?.profile?.role || null,
    };
  }

  const repository = getProductionRepository();
  const normalized = normalizeLegacyProjects(projects);
  const conversion = convertLegacyProjectsToProduction(normalized);

  if (!conversion.validation.valid) {
    return {
      saved: false,
      reason: 'LEGACY_CONVERSION_INVALID',
      validation: conversion.validation,
    };
  }

  try {
    const dataset = preserveLegacyCompatibilityFields(conversion.dataset, normalized);
    const result = await repository.saveDataset(dataset, { collections: requestedCollections });
    return {
      saved: true,
      reason: null,
      result,
      collections: requestedCollections,
      validation: conversion.validation,
    };
  } catch (error) {
    return {
      saved: false,
      reason: 'SHARED_BACKEND_SAVE_FAILED',
      error: normalizeBackendError(error, {
        operation: 'saveSharedProjects',
        provider: repository.provider,
      }),
    };
  }
};

/**
 * Explicitly seeds an empty shared backend from the current legacy project list.
 * The normal loader never performs this write automatically. Broad business
 * administration capability is required by the backend administration service.
 */
export const bootstrapSharedBackend = async (projects = []) => saveSharedProjects(projects, {
  collections: ['teamMembers', 'crews', 'customers', 'leads', 'jobs', 'workScopes', 'changeOrders'],
});

export const subscribeToSharedProjectChanges = (onChange) => {
  if (!isSharedBackendEnabled()) return () => {};
  return getProductionRepository().subscribe(onChange);
};
