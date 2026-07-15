import { CAPABILITY, createLocalOwnerProfile } from './permissions';

let accessContext = {
  provider: 'local',
  profile: createLocalOwnerProfile(),
};

const stable = (value) => JSON.stringify(value ?? null);

const projectMaps = (projects) => new Map((Array.isArray(projects) ? projects : []).map((project) => [project.id, project]));

const salesShape = (project = {}) => ({
  customer: project.customer || '',
  city: project.city || '',
  region: project.region || '',
  phone: project.phone || '',
  dateSold: project.dateSold || '',
  salesperson: project.salesperson || '',
  leadSource: project.leadSource || '',
});

const financialShape = (project = {}) => ({
  paymentType: project.paymentType || '',
  originalAmount: Number(project.originalAmount || 0),
  deposit: Number(project.deposit || 0),
  amountCollected: Number(project.amountCollected || 0),
  collectedDate: project.collectedDate || '',
  collected: Boolean(project.collected),
  thankYouSent: Boolean(project.thankYouSent),
  cancelled: Boolean(project.cancelled),
  cancellationDate: project.cancellationDate || '',
  cancellationReason: project.cancellationReason || '',
  changeOrders: Array.isArray(project.changeOrders) ? project.changeOrders : [],
});

const productionShape = (project = {}) => ({
  intake: project.intake || {},
  permits: project.permits || {},
  notes: project.notes || '',
  decisionNeeded: project.decisionNeeded || '',
  scopes: Array.isArray(project.scopes) ? project.scopes : [],
});

const changed = (before, after, selector) => stable(selector(before)) !== stable(selector(after));

export const setRuntimeAccessContext = (nextContext = {}) => {
  accessContext = {
    provider: nextContext.provider || 'local',
    profile: nextContext.profile || null,
  };
};

export const getRuntimeAccessContext = () => accessContext;

export const hasRuntimeCapability = (capability) => Boolean(
  accessContext.profile?.status === 'active'
  && accessContext.profile?.capabilities?.[capability],
);

export const authorizeLegacyProjectWrite = (currentProjects, nextProjects) => {
  const profile = accessContext.profile;
  if (!profile || profile.status !== 'active') {
    return { allowed: false, deniedCategories: ['authentication'], message: 'An active account is required to change project data.' };
  }

  if (profile.capabilities?.[CAPABILITY.LEGACY_FULL_WRITE]) {
    return { allowed: true, deniedCategories: [] };
  }

  const current = projectMaps(currentProjects);
  const next = projectMaps(nextProjects);
  const deniedCategories = new Set();

  const createdOrDeleted = [...current.keys()].some((id) => !next.has(id))
    || [...next.keys()].some((id) => !current.has(id));

  if (createdOrDeleted && !profile.capabilities?.[CAPABILITY.CREATE_PROJECTS]) {
    deniedCategories.add('project creation or removal');
  }

  next.forEach((afterProject, id) => {
    const beforeProject = current.get(id);
    if (!beforeProject) return;

    if (changed(beforeProject, afterProject, salesShape) && !profile.capabilities?.[CAPABILITY.MANAGE_SALES_DATA]) {
      deniedCategories.add('sales and customer fields');
    }

    if (changed(beforeProject, afterProject, financialShape) && !profile.capabilities?.[CAPABILITY.MANAGE_FINANCIAL_DATA]) {
      deniedCategories.add('financial and cancellation fields');
    }

    if (changed(beforeProject, afterProject, productionShape) && !profile.capabilities?.[CAPABILITY.MANAGE_PRODUCTION_DATA]) {
      deniedCategories.add('production and work-scope fields');
    }
  });

  if (!deniedCategories.size) return { allowed: true, deniedCategories: [] };

  const categories = [...deniedCategories];
  return {
    allowed: false,
    deniedCategories: categories,
    message: `Your role cannot change ${categories.join(', ')}. The unauthorized changes were not saved.`,
  };
};

export const authorizeDataOperation = (capability, operationLabel) => {
  if (hasRuntimeCapability(capability)) return { allowed: true };
  return {
    allowed: false,
    message: `Your role cannot ${operationLabel}.`,
  };
};

export const dispatchAuthorizationDenied = (detail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('mlb-authorization-denied', { detail }));
};
