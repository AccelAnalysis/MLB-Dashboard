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
  allocatedAmount: scope?.allocatedAmount === '' || scope?.allocatedAmount === null || scope?.allocatedAmount === undefined
    ? ''
    : Number(scope.allocatedAmount || 0),
  specs: asObject(scope?.specs),
});

export const normalizeLegacyProject = (project = {}) => {
  const changeOrders = Array.isArray(project?.changeOrders) ? project.changeOrders : [];
  const revisedAmount = Number(project?.originalAmount || 0)
    + changeOrders.reduce((sum, item) => sum + Number(item?.amount || 0), 0);
  const defaultAmountCollected = project?.collected ? revisedAmount : Number(project?.deposit || 0);

  return {
    ...asObject(project),
    amountCollected: project?.amountCollected === '' || project?.amountCollected === null || project?.amountCollected === undefined
      ? defaultAmountCollected
      : Number(project.amountCollected || 0),
    collectedDate: project?.collectedDate || '',
    cancellationDate: project?.cancellationDate || '',
    cancellationReason: project?.cancellationReason || '',
    changeOrders,
    intake: asObject(project?.intake),
    permits: asObject(project?.permits),
    scopes: Array.isArray(project?.scopes) ? project.scopes.map(normalizeLegacyScope) : [],
  };
};

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
