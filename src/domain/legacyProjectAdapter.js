const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

/**
 * Preserves the current prototype project shape at the storage boundary.
 *
 * Phase 3 introduces normalized production entities separately; the active
 * dashboard still consumes legacy nested project records. Keeping this adapter
 * explicit prevents production-model concerns from leaking into localStorage.
 */
export const normalizeLegacyScope = (scope = {}) => ({
  ...asObject(scope),
  measureRequested: scope?.measureRequested || '',
  specs: asObject(scope?.specs),
});

export const normalizeLegacyProject = (project = {}) => ({
  ...asObject(project),
  cancellationDate: project?.cancellationDate || '',
  cancellationReason: project?.cancellationReason || '',
  changeOrders: Array.isArray(project?.changeOrders) ? project.changeOrders : [],
  intake: asObject(project?.intake),
  permits: asObject(project?.permits),
  scopes: Array.isArray(project?.scopes) ? project.scopes.map(normalizeLegacyScope) : [],
});

export const normalizeLegacyProjects = (projects) => {
  if (!Array.isArray(projects)) return [];
  return projects.map(normalizeLegacyProject);
};

export const isLegacyProjectRecord = (project) => Boolean(
  project
  && typeof project === 'object'
  && project.id
  && Array.isArray(project.scopes),
);
