export const RECORD_STATUS = Object.freeze({
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived',
});

export const USER_STATUS = Object.freeze({
  INVITED: 'invited',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

export const USER_ROLE = Object.freeze({
  OWNER: 'owner',
  BUSINESS_ADMIN: 'business_admin',
  OPERATIONS_ADMIN: 'operations_admin',
  SALES_MANAGER: 'sales_manager',
  SALESPERSON: 'salesperson',
  PRODUCTION_MANAGER: 'production_manager',
  VIEWER: 'viewer',
  WALLBOARD: 'wallboard',
  DEVELOPER_SUPPORT: 'developer_support',
});

export const DATA_SOURCE = Object.freeze({
  DASHBOARD: 'dashboard',
  JOBNIMBUS: 'jobnimbus',
  SPREADSHEET: 'spreadsheet',
  MANUAL_IMPORT: 'manual_import',
  ACCOUNTING: 'accounting',
  CALCULATED: 'calculated',
});

export const SYNC_STATE = Object.freeze({
  LOCAL_ONLY: 'local_only',
  IMPORTED: 'imported',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  ERROR: 'error',
});

export const PRODUCTION_STAGE = Object.freeze({
  SOLD: 'sold',
  CONTRACT_RECEIVED: 'contract_received',
  MEASURE_REQUESTED: 'measure_requested',
  MEASURED: 'measured',
  MATERIAL_LIST_RECEIVED: 'material_list_received',
  MATERIALS_ORDERED: 'materials_ordered',
  WAITING_MATERIALS: 'waiting_materials',
  MATERIALS_RECEIVED: 'materials_received',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FUNDING_PENDING: 'funding_pending',
  COLLECTED: 'collected',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
});

export const PAYMENT_STATUS = Object.freeze({
  NOT_INVOICED: 'not_invoiced',
  DEPOSIT_DUE: 'deposit_due',
  DEPOSIT_RECEIVED: 'deposit_received',
  BALANCE_DUE: 'balance_due',
  FUNDING_PENDING: 'funding_pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  WRITTEN_OFF: 'written_off',
});

export const CHANGE_ORDER_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  VOID: 'void',
});

export const LEAD_STATUS = Object.freeze({
  NEW: 'new',
  ASSIGNED: 'assigned',
  APPOINTMENT_SET: 'appointment_set',
  PITCHED: 'pitched',
  SOLD: 'sold',
  LOST: 'lost',
  CANCELLED: 'cancelled',
});
