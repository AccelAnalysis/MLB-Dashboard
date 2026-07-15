import { daysBetween, todayISO } from './dateUtils';

export const getRevisedAmount = (project) =>
  Number(project.originalAmount) + (project.changeOrders?.reduce((sum, co) => sum + Number(co.amount || 0), 0) || 0);

export const isProjectClosed = (project) =>
  !project.cancelled
  && project.scopes.length > 0
  && project.scopes.every((scope) => scope.completionDate)
  && project.collected
  && project.thankYouSent;

export const getScopeStatus = (scope) => {
  if (scope.completionDate) return { label: 'Completed', color: 'bg-gray-200 text-gray-800 border-gray-300', stage: 7 };
  if (scope.scheduledInstallDate) return { label: 'Scheduled', color: 'bg-pink-100 text-pink-700 border-pink-200', stage: 6 };
  if (scope.materialsIn) return { label: 'Materials In', color: 'bg-orange-100 text-orange-700 border-orange-200', stage: 5 };
  if (scope.materialETA) return { label: 'Material ETA', color: 'bg-blue-100 text-blue-700 border-blue-200', stage: 4 };
  if (scope.dateOrdered) return { label: 'Ordered', color: 'bg-teal-100 text-teal-700 border-teal-200', stage: 3 };
  if (scope.materialListReceived) return { label: 'Ready to Order', color: 'bg-green-100 text-green-800 border-green-200', stage: 2 };
  if (scope.measureCompleted) return { label: 'Needs List', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', stage: 1 };
  if (scope.measurer || scope.measureRequested) return { label: 'Measure Assigned', color: 'bg-purple-100 text-purple-700 border-purple-200', stage: 0 };
  return { label: 'Needs Measurer', color: 'bg-red-50 text-red-700 border-red-200', stage: -1 };
};

export const calculateNextAction = (scope, project) => {
  if (scope.completionDate) return project?.collected ? 'Send thank-you / close file' : 'Collect / fund balance';
  if (scope.scheduledInstallDate) return 'Execute installation';
  if (scope.materialsIn) return 'Schedule customer and assign crew';
  if (scope.materialETA) return 'Track material delivery';
  if (scope.dateOrdered) return 'Confirm material ETA';
  if (scope.materialListReceived) return 'Order materials';
  if (scope.measureCompleted) return 'Submit material list';
  if (scope.measurer || scope.measureRequested) return 'Complete measurement';
  return 'Assign measurer';
};

export const getScopeAlerts = (project, scope) => {
  if (project.cancelled || isProjectClosed(project) || scope.completionDate) return [];

  const today = todayISO();
  const alerts = [];
  const measureAnchor = scope.measureRequested || project.dateSold;

  if (!scope.measurer && project.dateSold && daysBetween(today, project.dateSold) > 1) {
    alerts.push({ type: 'Needs Measurer', daysStuck: daysBetween(today, project.dateSold) });
  }

  if ((scope.measurer || scope.measureRequested) && !scope.measureCompleted && measureAnchor && daysBetween(today, measureAnchor) > 3) {
    alerts.push({ type: 'Measurement SLA', daysStuck: daysBetween(today, measureAnchor) });
  }

  if (scope.measureCompleted && !scope.materialListReceived && daysBetween(today, scope.measureCompleted) > 2) {
    alerts.push({ type: 'Material List Needed', daysStuck: daysBetween(today, scope.measureCompleted) });
  }

  if (scope.materialListReceived && !scope.dateOrdered && daysBetween(today, scope.materialListReceived) > 2) {
    alerts.push({ type: 'Needs Order', daysStuck: daysBetween(today, scope.materialListReceived) });
  }

  if (scope.materialETA && !scope.materialsIn && scope.materialETA < today) {
    alerts.push({ type: 'Materials Late', daysStuck: daysBetween(today, scope.materialETA) });
  }

  if (scope.materialsIn && !scope.scheduledInstallDate && daysBetween(today, scope.materialsIn) > 3) {
    alerts.push({ type: 'Needs Scheduling', daysStuck: daysBetween(today, scope.materialsIn) });
  }

  if (scope.scheduledInstallDate && !scope.completionDate && scope.scheduledInstallDate < today) {
    alerts.push({ type: 'Install Overdue', daysStuck: daysBetween(today, scope.scheduledInstallDate) });
  }

  return alerts;
};

export const getProjectAlerts = (project) => {
  const scopeAlerts = project.scopes.flatMap((scope) => getScopeAlerts(project, scope).map((alert) => ({ ...alert, scope })));

  if (!project.cancelled && project.scopes.length > 0 && project.scopes.every((scope) => scope.completionDate) && !project.collected) {
    scopeAlerts.push({
      type: 'Collection Needed',
      daysStuck: Math.max(...project.scopes.map((scope) => daysBetween(todayISO(), scope.completionDate || todayISO()))),
      scope: null,
    });
  }

  if (project.decisionNeeded) {
    scopeAlerts.push({ type: 'Decision Needed', daysStuck: daysBetween(todayISO(), project.dateSold), scope: null });
  }

  return scopeAlerts;
};
