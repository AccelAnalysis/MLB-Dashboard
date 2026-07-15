import { todayISO, daysBetween } from './dateUtils';
import { getProjectAlerts, getRevisedAmount } from './projectStatus';
import { getProjectCompletionDate } from './projectMetrics';

export const CUSTOMER_SORT_OPTIONS = [
  ['customer-asc', 'Customer A–Z'],
  ['customer-desc', 'Customer Z–A'],
  ['sold-desc', 'Newest sold'],
  ['sold-asc', 'Oldest sold'],
  ['amount-desc', 'Highest revised amount'],
  ['amount-asc', 'Lowest revised amount'],
  ['active-desc', 'Longest since sold'],
  ['alerts-desc', 'Most urgent / most alerts'],
  ['balance-desc', 'Largest open balance'],
  ['install-asc', 'Nearest scheduled installation'],
];

export const EMPTY_CUSTOMER_FILTERS = {
  region: '', status: '', alerts: '', productCategory: '', salesperson: '', leadSource: '',
  paymentType: '', crew: '', measurer: '',
};

const normalized = (value) => String(value ?? '').trim().toLowerCase();
const textIncludes = (value, query) => normalized(value).includes(query);
const openBalance = (project) => Math.max(0, getRevisedAmount(project) - Number(project.amountCollected || project.deposit || 0));
const nearestInstall = (project) => (project.scopes || []).map((scope) => scope.scheduledInstallDate).filter(Boolean).sort()[0] || '9999-12-31';

export const getCustomerSearchText = (project) => [
  project.customer, project.city, project.phone, project.id, project.salesperson, project.leadSource,
  project.region, project.paymentType, project.notes, project.decisionNeeded,
  ...(project.scopes || []).flatMap((scope) => [scope.type, scope.crew, scope.measurer, scope.notes]),
].map(normalized).join(' ');

export const matchesCustomerFilters = (project, filters = EMPTY_CUSTOMER_FILTERS) => {
  const alerts = getProjectAlerts(project);
  const completed = Boolean(getProjectCompletionDate(project));
  const statusMatches = !filters.status
    || (filters.status === 'active-production' && !project.cancelled && !completed)
    || (filters.status === 'production-completed' && !project.cancelled && completed)
    || (filters.status === 'cancelled' && project.cancelled)
    || (filters.status === 'awaiting-collection' && !project.cancelled && completed && !(project.collected || project.funded));
  return (!filters.region || project.region === filters.region)
    && statusMatches
    && (!filters.alerts || (filters.alerts === 'has' ? alerts.length > 0 : alerts.length === 0))
    && (!filters.productCategory || (project.scopes || []).some((scope) => scope.type === filters.productCategory))
    && (!filters.salesperson || project.salesperson === filters.salesperson)
    && (!filters.leadSource || project.leadSource === filters.leadSource)
    && (!filters.paymentType || project.paymentType === filters.paymentType)
    && (!filters.crew || (project.scopes || []).some((scope) => scope.crew === filters.crew))
    && (!filters.measurer || (project.scopes || []).some((scope) => scope.measurer === filters.measurer));
};

const compareText = (a, b) => normalized(a).localeCompare(normalized(b));
const compareNumber = (a, b) => Number(a || 0) - Number(b || 0);

export const sortCustomerProjects = (projects, sort = 'customer-asc') => projects
  .map((project, index) => ({ project, index }))
  .sort((left, right) => {
    const a = left.project;
    const b = right.project;
    let result = 0;
    if (sort === 'customer-asc') result = compareText(a.customer, b.customer);
    if (sort === 'customer-desc') result = compareText(b.customer, a.customer);
    if (sort === 'sold-desc') result = compareText(b.dateSold, a.dateSold);
    if (sort === 'sold-asc') result = compareText(a.dateSold, b.dateSold);
    if (sort === 'amount-desc') result = compareNumber(getRevisedAmount(b), getRevisedAmount(a));
    if (sort === 'amount-asc') result = compareNumber(getRevisedAmount(a), getRevisedAmount(b));
    if (sort === 'active-desc') result = compareNumber(daysBetween(todayISO(), b.dateSold), daysBetween(todayISO(), a.dateSold));
    if (sort === 'alerts-desc') result = compareNumber(getProjectAlerts(b).length, getProjectAlerts(a).length);
    if (sort === 'balance-desc') result = compareNumber(openBalance(b), openBalance(a));
    if (sort === 'install-asc') result = compareText(nearestInstall(a), nearestInstall(b));
    return result || left.index - right.index;
  })
  .map(({ project }) => project);

export const filterCustomerProjects = (projects, { search = '', filters = EMPTY_CUSTOMER_FILTERS, sort = 'customer-asc' } = {}) => {
  const query = normalized(search);
  return sortCustomerProjects(projects.filter((project) => (
    (!query || textIncludes(getCustomerSearchText(project), query)) && matchesCustomerFilters(project, filters)
  )), sort);
};

export const uniqueProjectValues = (projects, getter) => [...new Set(projects.flatMap(getter).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
