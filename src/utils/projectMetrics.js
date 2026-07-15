import { daysBetween, todayISO } from './dateUtils';
import { getProjectAlerts, getRevisedAmount, isProjectClosed } from './projectStatus';

export const createPipelineMetrics = (projects) => {
  const flatScopes = projects.flatMap((project) => project.scopes.map((scope) => ({ project, scope })));
  const activeProjects = projects.filter((project) => !project.cancelled && !isProjectClosed(project));
  const completedScopes = flatScopes.filter((item) => item.scope.completionDate && !item.project.cancelled);
  const scheduledScopes = flatScopes.filter((item) => item.scope.scheduledInstallDate && !item.scope.completionDate && !item.project.cancelled);
  const alertCount = projects.reduce((sum, project) => sum + getProjectAlerts(project).length, 0);
  const collectionOpen = projects.filter((project) => !project.cancelled && project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate) && !project.collected).length;
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

export const createSalesStats = (projects, salesActivity = {}) => {
  const stats = {};

  projects.forEach((project) => {
    const name = project.salesperson || 'Unassigned';
    if (!stats[name]) {
      const activity = salesActivity[name] || { leads: 0, opportunities: 0 };
      stats[name] = {
        name,
        revenue: 0,
        deposits: 0,
        projects: 0,
        cancelled: 0,
        scopes: 0,
        leads: activity.leads,
        opportunities: activity.opportunities,
      };
    }

    if (project.cancelled) {
      stats[name].cancelled += 1;
      return;
    }

    stats[name].revenue += getRevisedAmount(project);
    stats[name].deposits += Number(project.deposit || 0);
    stats[name].projects += 1;
    stats[name].scopes += project.scopes.length;
  });

  return Object.values(stats)
    .map((rep) => ({
      ...rep,
      avgTicket: rep.projects ? Math.round(rep.revenue / rep.projects) : 0,
      valuePerLead: rep.leads ? Math.round(rep.revenue / rep.leads) : 0,
      closingRate: rep.leads ? rep.projects / rep.leads : 0,
      cancellationRate: rep.projects + rep.cancelled ? rep.cancelled / (rep.projects + rep.cancelled) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
};

export const createWallboardSalesTotals = (salesStats) => {
  const totalRevenue = salesStats.reduce((sum, rep) => sum + rep.revenue, 0);
  const totalLeads = salesStats.reduce((sum, rep) => sum + rep.leads, 0);
  const totalProjects = salesStats.reduce((sum, rep) => sum + rep.projects, 0);
  const totalCancelled = salesStats.reduce((sum, rep) => sum + rep.cancelled, 0);
  const topRep = salesStats[0];

  return {
    totalRevenue,
    totalLeads,
    totalProjects,
    totalCancelled,
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

    if (!project.cancelled && project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate) && !project.collected) {
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
