import { USER_ROLE } from '../domain/enums';

export const CAPABILITY = Object.freeze({
  VIEW_DASHBOARD: 'viewDashboard',
  VIEW_WALLBOARD: 'viewWallboard',
  MANAGE_USERS: 'manageUsers',
  MANAGE_BUSINESS_DATA: 'manageBusinessData',
  MANAGE_SALES_DATA: 'manageSalesData',
  MANAGE_PRODUCTION_DATA: 'manageProductionData',
  LEGACY_FULL_WRITE: 'legacyFullWrite',
  BACKEND_ADMINISTRATION: 'backendAdministration',
  READ_ONLY: 'readOnly',
  WALLBOARD_ONLY: 'wallboardOnly',
});

const roleCapabilities = {
  [USER_ROLE.OWNER]: {
    viewDashboard: true,
    viewWallboard: true,
    manageUsers: true,
    manageBusinessData: true,
    manageSalesData: true,
    manageProductionData: true,
    legacyFullWrite: true,
    backendAdministration: true,
    readOnly: false,
    wallboardOnly: false,
  },
  [USER_ROLE.BUSINESS_ADMIN]: {
    viewDashboard: true,
    viewWallboard: true,
    manageUsers: true,
    manageBusinessData: true,
    manageSalesData: true,
    manageProductionData: true,
    legacyFullWrite: true,
    backendAdministration: true,
    readOnly: false,
    wallboardOnly: false,
  },
  [USER_ROLE.OPERATIONS_ADMIN]: {
    viewDashboard: true,
    viewWallboard: true,
    manageUsers: false,
    manageBusinessData: true,
    manageSalesData: true,
    manageProductionData: true,
    legacyFullWrite: true,
    backendAdministration: true,
    readOnly: false,
    wallboardOnly: false,
  },
  [USER_ROLE.SALES_MANAGER]: {
    viewDashboard: true,
    viewWallboard: true,
    manageUsers: false,
    manageBusinessData: false,
    manageSalesData: true,
    manageProductionData: false,
    legacyFullWrite: false,
    backendAdministration: false,
    readOnly: true,
    wallboardOnly: false,
  },
  [USER_ROLE.SALESPERSON]: {
    viewDashboard: true,
    viewWallboard: false,
    manageUsers: false,
    manageBusinessData: false,
    manageSalesData: false,
    manageProductionData: false,
    legacyFullWrite: false,
    backendAdministration: false,
    readOnly: true,
    wallboardOnly: false,
  },
  [USER_ROLE.PRODUCTION_MANAGER]: {
    viewDashboard: true,
    viewWallboard: true,
    manageUsers: false,
    manageBusinessData: false,
    manageSalesData: false,
    manageProductionData: true,
    legacyFullWrite: false,
    backendAdministration: false,
    readOnly: true,
    wallboardOnly: false,
  },
  [USER_ROLE.VIEWER]: {
    viewDashboard: true,
    viewWallboard: true,
    manageUsers: false,
    manageBusinessData: false,
    manageSalesData: false,
    manageProductionData: false,
    legacyFullWrite: false,
    backendAdministration: false,
    readOnly: true,
    wallboardOnly: false,
  },
  [USER_ROLE.WALLBOARD]: {
    viewDashboard: false,
    viewWallboard: true,
    manageUsers: false,
    manageBusinessData: false,
    manageSalesData: false,
    manageProductionData: false,
    legacyFullWrite: false,
    backendAdministration: false,
    readOnly: true,
    wallboardOnly: true,
  },
  [USER_ROLE.DEVELOPER_SUPPORT]: {
    viewDashboard: true,
    viewWallboard: true,
    manageUsers: false,
    manageBusinessData: false,
    manageSalesData: false,
    manageProductionData: false,
    legacyFullWrite: false,
    backendAdministration: true,
    readOnly: true,
    wallboardOnly: false,
  },
};

const denied = Object.freeze({
  viewDashboard: false,
  viewWallboard: false,
  manageUsers: false,
  manageBusinessData: false,
  manageSalesData: false,
  manageProductionData: false,
  legacyFullWrite: false,
  backendAdministration: false,
  readOnly: true,
  wallboardOnly: false,
});

export const getRoleCapabilities = (role) => ({
  ...denied,
  ...(roleCapabilities[role] || {}),
});

export const mergeServerCapabilities = (role, serverCapabilities = {}) => ({
  ...getRoleCapabilities(role),
  ...serverCapabilities,
});

export const hasCapability = (profile, capability) => Boolean(
  profile?.status === 'active'
  && profile?.capabilities?.[capability],
);

export const ROLE_LABELS = Object.freeze({
  owner: 'Owner',
  business_admin: 'Business Admin',
  operations_admin: 'Operations Admin',
  sales_manager: 'Sales Manager',
  salesperson: 'Salesperson',
  production_manager: 'Production Manager',
  viewer: 'Viewer',
  wallboard: 'Wallboard',
  developer_support: 'Developer Support',
});

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
