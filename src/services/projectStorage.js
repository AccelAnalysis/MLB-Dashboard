import {
  isLegacyProjectRecord,
  normalizeLegacyProjects,
} from '../domain/legacyProjectAdapter';

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

const canPersistLegacyProjects = () => (
  typeof window === 'undefined'
  || window.__MLB_LEGACY_CAN_WRITE__ !== false
);

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
  if (!options.force && !canPersistLegacyProjects()) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeProjects(projects)));
  return true;
};

export const resetProjects = () => {
  if (!canPersistLegacyProjects()) return false;
  localStorage.removeItem(STORAGE_KEY);
  return true;
};

export const exportProjectsJson = (projects) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadTextFile(
    `mlb-dashboard-backup-${timestamp}.json`,
    JSON.stringify(normalizeProjects(projects), null, 2),
    'application/json',
  );
};

export const importProjectsJson = async (file) => {
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

// The nested project cache remains a compatibility layer for the large legacy
// dashboard component. Phase 5 blocks user-initiated cache writes for roles that
// cannot safely persist the complete legacy dataset. Authorized remote hydration
// may use saveProjects(projects, { force: true }) to refresh the read-only cache.
