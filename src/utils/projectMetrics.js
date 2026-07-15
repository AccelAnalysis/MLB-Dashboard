import { daysBetween, todayISO } from './dateUtils';
import { getProjectAlerts, getRevisedAmount, isProjectClosed } from './projectStatus';

const ALL_CATEGORIES = 'All';
const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const hasExplicitAllocation = (scope) => scope?.allocatedAmount !== ''
  && scope?.allocatedAmount !== null
  && scope?.allocatedAmount !== undefined
  && Number.isFinite(Number(scope.allocatedAmount))
  && Number(scope.allocatedAmount) >= 0;
const matchesCategory = (project, category = ALL_CATEGORIES) => (
  !category
  || category === ALL_CATEGORIES
  || (project.scopes || []).some((scope) => scope.type === category)
);
const matchesRegion = (project, region = ALL_CATEGORIES) => !region || region === ALL_CATEGORIES || project.region === region;

export const getProjectCompletionDate = (project) => {
  const scopes = Array.isArray(project?.scopes) ? project.scopes : [];
  if (!scopes.length || !scopes.every((scope) => scope.completionDate)) return '';
  return scopes.map((scope) => scope.completionDate).sort().at(-1) || '';
};

export const getCategoryRevenue = (project, category = ALL_CATEGORIES) => {
  const revisedAmount = getRevisedAmount(project);
  const scopes = Array.isArray(project?.scopes) ? project.scopes : [];

  if (!category || category === ALL_CATEGORIES) {
    return { matched: true, included: true, revenue: revisedAmount, reason: null };
  }

  const matchingScopes = scopes.filter((scope) => scope.type === category);
  if (!matchingScopes.length) {
    return { matched: false, included: false, revenue: 0, reason: 'NO_CATEGORY_MATCH' };
  }

  if (scopes.length === 1) {
    return { matched: true, included: true, revenue: revisedAmount, reason: null };
  }

  const allocationsComplete = scopes.every(hasExplicitAllocation);
  const allocatedTotal = scopes.reduce((sum, scope) => sum + asNumber(scope.allocatedAmount), 0);
  const allocationsBalance = Math.abs(allocatedTotal - revisedAmount) <= 1;

  if (!allocationsComplete || !allocationsBalance) {
    return {
      matched: true,
      included: false,
      revenue: 0,
      reason: allocationsComplete ? 'ALLOCATION_TOTAL_MISMATCH' : 'ALLOCATION_REQUIRED',
      allocatedTotal,
      revisedAmount,
    };
  }

  return {
    matched: true,
    included: true,
    revenue: matchingScopes.reduce((sum, scope) => sum + asNumber(scope.allocatedAmount), 0),
    reason: null,
    allocatedTotal,
    revisedAmount,
  };
};

export const createPipelineMetrics = (projects) => {
  const flatScopes = projects.flatMap((project) => project.scopes.map((scope) => ({ project, scope })));
  const activeProjects = projects.filter((project) => !project.cancelled && !isProjectClosed(project));
  const completedScopes = flatScopes.filter((item) => item.scope.completionDate && !item.project.cancelled);
  const scheduledScopes = flatScopes.filter((item) => item.scope.scheduledInstallDate && !item.scope.completionDate && !item.project.cancelled);
  const alertCount = projects.reduce((sum, project) => sum + getProjectAlerts(project).length, 0);
  const collectionOpen = projects.filter((project) => !project.cancelled && getProjectCompletionDate(project) && !project.collected).length;
  const totalRevenue = activeProjects.reduce((sum, project) => sum + getRevisedAmount(project), 0);
  const totalDeposits = activeProjects.reduce((sum, project) => sum + Number(project.deposit || 0), 0);
  const avgSoldToDone = completedScopes.length
    ? Math.round(completedScopes.reduce((sum, item) => sum + daysBetween(item.scope.completionDate, item.project.dateSold), 0) / completedScopes.length)
    : 0;

  return {
    activeProjects,
    totalRevenue,
    totalDeposits,
    scheduledCount: scheduledScopes.length,
    collectionOpen,
    alertCount,
    avgSoldToDone,
  };
};

const normalizeActivityInput = (salesActivity) => {
  if (Array.isArray(salesActivity)) return salesActivity;
  return Object.entries(salesActivity || {}).map(([salesperson, activity]) => ({
    id: `legacy-${salesperson}`,
    salesperson,
    leads: asNumber(activity?.leads),
    opportunities: asNumber(activity?.opportunities),
    region: ALL_CATEGORIES,
    category: ALL_CATEGORIES,
  }));
};

export const createSalesStats = (projects, salesActivity = [], options = {}) => {
  const category = options.category || ALL_CATEGORIES;
  const activities = normalizeActivityInput(salesActivity).filter((activity) => (
    !category || category === ALL_CATEGORIES || activity.category === category
  ));
  const stats = {};

  const ensureRep = (name) => {
    const safeName = name || 'Unassigned';
    if (!stats[safeName]) {
      stats[safeName] = {
        name: safeName,
        revenue: 0,
        deposits: 0,
        projects: 0,
        cancelled: 0,
        scopes: 0,
        leads: 0,
        opportunities: 0,
        unallocatedProjects: 0,
      };
    }
    return stats[safeName];
  };

  activities.forEach((activity) => {
    const rep = ensureRep(activity.salesperson);
    rep.leads += asNumber(activity.leads);
    rep.opportunities += asNumber(activity.opportunities);
  });

  projects.forEach((project) => {
    const revenue = getCategoryRevenue(project, category);
    if (!revenue.matched) return;
    const rep = ensureRep(project.salesperson);

    if (project.cancelled) {
      rep.cancelled += 1;
      return;
    }

    rep.projects += 1;
    rep.scopes += category === ALL_CATEGORIES
      ? project.scopes.length
      : project.scopes.filter((scope) => scope.type === category).length;
    rep.deposits += Number(project.deposit || 0);
    if (revenue.included) rep.revenue += revenue.revenue;
    else rep.unallocatedProjects += 1;
  });

  return Object.values(stats)
    .map((rep) => ({
      ...rep,
      avgTicket: rep.projects ? Math.round(rep.revenue / rep.projects) : 0,
      valuePerLead: rep.leads ? Math.round(rep.revenue / rep.leads) : 0,
      closingRate: rep.leads ? rep.projects / rep.leads : 0,
      cancellationRate: rep.projects + rep.cancelled ? rep.cancelled / (rep.projects + rep.cancelled) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
};

export const createSalesVsProductionMetrics = (projects, options = {}) => {
  const region = options.region || ALL_CATEGORIES;
  const category = options.category || ALL_CATEGORIES;
  const matchesPeriod = options.matchesPeriod || (() => true);
  const unresolved = new Set();
  let soldValue = 0;
  let completedValue = 0;
  let soldProjects = 0;
  let completedProjects = 0;

  projects.filter((project) => matchesRegion(project, region) && matchesCategory(project, category) && !project.cancelled)
    .forEach((project) => {
      const revenue = getCategoryRevenue(project, category);
      if (matchesPeriod(project.dateSold)) {
        soldProjects += 1;
        if (revenue.included) soldValue += revenue.revenue;
        else unresolved.add(project.id);
      }

      const completionDate = getProjectCompletionDate(project);
      if (completionDate && matchesPeriod(completionDate)) {
        completedProjects += 1;
        if (revenue.included) completedValue += revenue.revenue;
        else unresolved.add(project.id);
      }
    });

  return {
    soldValue,
    completedValue,
    soldProjects,
    completedProjects,
    backlogMovement: soldValue - completedValue,
    productionToSalesRatio: soldValue ? completedValue / soldValue : 0,
    unallocatedProjects: unresolved.size,
  };
};

export const createCollectionMetrics = (projects, options = {}) => {
  const region = options.region || ALL_CATEGORIES;
  const category = options.category || ALL_CATEGORIES;
  const matchesPeriod = options.matchesPeriod || (() => true);
  const cycleDays = [];
  let openProjects = 0;
  let collectedProjects = 0;
  let missingCollectionDate = 0;
  let invalidCollectionDate = 0;

  projects.filter((project) => matchesRegion(project, region) && matchesCategory(project, category) && !project.cancelled)
    .forEach((project) => {
      const completionDate = getProjectCompletionDate(project);
      if (!completionDate || !matchesPeriod(completionDate)) return;
      if (!project.collected) {
        openProjects += 1;
        return;
      }

      collectedProjects += 1;
      if (!project.collectedDate) {
        missingCollectionDate += 1;
        return;
      }

      const days = daysBetween(project.collectedDate, completionDate);
      if (days < 0) invalidCollectionDate += 1;
      else cycleDays.push(days);
    });

  return {
    openProjects,
    collectedProjects,
    missingCollectionDate,
    invalidCollectionDate,
    measuredProjects: cycleDays.length,
    avgCompletionToPayment: cycleDays.length
      ? Math.round(cycleDays.reduce((sum, days) => sum + days, 0) / cycleDays.length)
      : 0,
  };
};

export const createCategoryIntegritySummary = (projects, category = ALL_CATEGORIES) => {
  if (!category || category === ALL_CATEGORIES) {
    return { category: ALL_CATEGORIES, matchingProjects: projects.length, recognizedRevenue: projects.reduce((sum, project) => sum + (project.cancelled ? 0 : getRevisedAmount(project)), 0), unallocatedProjects: 0 };
  }

  let matchingProjects = 0;
  let recognizedRevenue = 0;
  let unallocatedProjects = 0;
  projects.forEach((project) => {
    const revenue = getCategoryRevenue(project, category);
    if (!revenue.matched) return;
    matchingProjects += 1;
    if (project.cancelled) return;
    if (revenue.included) recognizedRevenue += revenue.revenue;
    else unallocatedProjects += 1;
  });

  return { category, matchingProjects, recognizedRevenue, unallocatedProjects };
};

export const createWallboardSalesTotals = (salesStats) => {
  const totalRevenue = salesStats.reduce((sum, rep) => sum + rep.revenue, 0);
  const totalLeads = salesStats.reduce((sum, rep) => sum + rep.leads, 0);
  const totalProjects = salesStats.reduce((sum, rep) => sum + rep.projects, 0);
  const totalCancelled = salesStats.reduce((sum, rep) => sum + rep.cancelled, 0);
  const unallocatedProjects = salesStats.reduce((sum, rep) => sum + rep.unallocatedProjects, 0);
  const topRep = salesStats[0];

  return {
    totalRevenue,
    totalLeads,
    totalProjects,
    totalCancelled,
    unallocatedProjects,
    closeRate: totalLeads ? Math.round((totalProjects / totalLeads) * 100) : 0,
    cancellationRate: totalProjects + totalCancelled ? Math.round((totalCancelled / (totalProjects + totalCancelled)) * 100) : 0,
    topRep,
  };
};

export const createCriticalPathSpotlight = (projects, getScopeAlerts, calculateNextAction) => {
  const discussionItems = [];

  projects.forEach((project) => {
    const projectDays = daysBetween(todayISO(), project.dateSold);

    if (project.decisionNeeded) {
      discussionItems.push({
        id: `${project.id}-decision`,
        project,
        scope: null,
        label: 'Decision Needed',
        detail: project.decisionNeeded,
        priority: 100 + projectDays,
      });
    }

    if (!project.cancelled && getProjectCompletionDate(project) && !project.collected) {
      discussionItems.push({
        id: `${project.id}-collection`,
        project,
        scope: null,
        label: 'Collection / Funding',
        detail: 'Completed project is not collected or funded.',
        priority: 90 + projectDays,
      });
    }

    if (project.cancelled) {
      discussionItems.push({
        id: `${project.id}-cancelled`,
        project,
        scope: null,
        label: 'Cancelled',
        detail: project.cancellationReason || 'Cancelled job needs reason/details completed.',
        priority: 40 + projectDays,
      });
    }

    project.scopes.forEach((scope) => {
      getScopeAlerts(project, scope).forEach((alert) => {
        discussionItems.push({
          id: `${project.id}-${scope.id}-${alert.type}`,
          project,
          scope,
          label: alert.type,
          detail: calculateNextAction(scope, project),
          priority: alert.daysStuck,
        });
      });
    });
  });

  return discussionItems.sort((a, b) => b.priority - a.priority).slice(0, 8);
};
