import {
  isLegacyProjectRecord,
  normalizeLegacyProjects,
} from '../domain/legacyProjectAdapter';
import { CAPABILITY } from '../auth/permissions';
import {
  authorizeDataOperation,
  authorizeLegacyProjectWrite,
  dispatchAuthorizationDenied,
} from '../auth/runtimeAuthorization';

export const STORAGE_KEY = 'mlb-dashboard-projects-v1';

const downloadTextFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const normalizeProjects = (projects) => normalizeLegacyProjects(projects);

export const loadProjects = (fallbackProjects = []) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeProjects(fallbackProjects);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return normalizeProjects(fallbackProjects);
    return normalizeProjects(parsed);
  } catch {
    return normalizeProjects(fallbackProjects);
  }
};

export const saveProjects = (projects, options = {}) => {
  const normalized = normalizeProjects(projects);
  const bypassAuthorization = Boolean(options.force || options.bypassAuthorization);

  if (!bypassAuthorization) {
    const authorization = authorizeLegacyProjectWrite(loadProjects(), normalized);
    if (!authorization.allowed) {
      dispatchAuthorizationDenied({ operation: 'saveProjects', ...authorization });
      return false;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return true;
};

export const resetProjects = (options = {}) => {
  if (!options.force && !options.bypassAuthorization) {
    const authorization = authorizeDataOperation(CAPABILITY.RESET_DATA, 'reset dashboard data');
    if (!authorization.allowed) {
      dispatchAuthorizationDenied({ operation: 'resetProjects', ...authorization });
      return false;
    }
  }

  localStorage.removeItem(STORAGE_KEY);
  return true;
};

export const exportProjectsJson = (projects) => {
  const authorization = authorizeDataOperation(CAPABILITY.IMPORT_EXPORT, 'export dashboard backups');
  if (!authorization.allowed) {
    dispatchAuthorizationDenied({ operation: 'exportProjectsJson', ...authorization });
    return false;
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(
    `mlb-dashboard-backup-${timestamp}.json`,
    JSON.stringify(normalizeProjects(projects), null, 2),
    'application/json',
  );
  return true;
};

export const importProjectsJson = async (file) => {
  const authorization = authorizeDataOperation(CAPABILITY.IMPORT_EXPORT, 'import dashboard backups');
  if (!authorization.allowed) {
    dispatchAuthorizationDenied({ operation: 'importProjectsJson', ...authorization });
    throw new Error(authorization.message);
  }

  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('Backup JSON must contain an array of projects.');
  }

  const normalized = normalizeProjects(parsed);
  if (!normalized.every(isLegacyProjectRecord)) {
    throw new Error('Backup JSON does not match the expected project structure.');
  }

  return normalized;
};

// localStorage remains an immediate compatibility cache. Runtime authorization
// prevents read-only or narrowly scoped roles from persisting unauthorized
// changes before shared-backend synchronization. Remote hydration may bypass the
// guard with saveProjects(projects, { force: true }).
