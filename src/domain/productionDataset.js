import { PRODUCTION_MODEL_NAME, PRODUCTION_MODEL_VERSION } from './modelVersion';
import {
  createActivityLog,
  createChangeOrder,
  createCrew,
  createCustomer,
  createImportRun,
  createJob,
  createLead,
  createStatusEvent,
  createTeamMember,
  createUserProfile,
  createWorkScope,
} from './entityFactories';
import { validateProductionDataset } from './validation';

const arrayOf = (value) => (Array.isArray(value) ? value : []);

export const createEmptyProductionDataset = (input = {}) => ({
  schema: PRODUCTION_MODEL_NAME,
  modelVersion: PRODUCTION_MODEL_VERSION,
  exportedAt: input.exportedAt || new Date().toISOString(),
  customers: [],
  leads: [],
  jobs: [],
  workScopes: [],
  changeOrders: [],
  statusEvents: [],
  activityLogs: [],
  users: [],
  teamMembers: [],
  crews: [],
  importRuns: [],
});

export const normalizeProductionDataset = (input = {}) => ({
  ...createEmptyProductionDataset(input),
  schema: PRODUCTION_MODEL_NAME,
  modelVersion: PRODUCTION_MODEL_VERSION,
  exportedAt: input.exportedAt || new Date().toISOString(),
  customers: arrayOf(input.customers).map(createCustomer),
  leads: arrayOf(input.leads).map(createLead),
  jobs: arrayOf(input.jobs).map(createJob),
  workScopes: arrayOf(input.workScopes).map(createWorkScope),
  changeOrders: arrayOf(input.changeOrders).map(createChangeOrder),
  statusEvents: arrayOf(input.statusEvents).map(createStatusEvent),
  activityLogs: arrayOf(input.activityLogs).map(createActivityLog),
  users: arrayOf(input.users).map(createUserProfile),
  teamMembers: arrayOf(input.teamMembers).map(createTeamMember),
  crews: arrayOf(input.crews).map(createCrew),
  importRuns: arrayOf(input.importRuns).map(createImportRun),
});

export const prepareProductionDataset = (input = {}) => {
  const dataset = normalizeProductionDataset(input);
  const validation = validateProductionDataset(dataset);
  return { dataset, validation };
};
