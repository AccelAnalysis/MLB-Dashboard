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

export const saveProjects = (projects) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeProjects(projects)));
};

export const resetProjects = () => {
  localStorage.removeItem(STORAGE_KEY);
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

// TODO: Replace localStorage calls above with the selected shared backend after
// authentication, roles, audit requirements, and migration ownership are approved.
