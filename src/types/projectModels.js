/**
 * Phase 2 project model reference.
 *
 * This repository currently uses JavaScript rather than TypeScript, so these
 * JSDoc typedefs document the production data contracts without changing the
 * runtime bundle or requiring a compiler migration.
 */

/**
 * @typedef {Object} ProjectScope
 * @property {string} id
 * @property {string} type
 * @property {string} measurer
 * @property {string} measureRequested
 * @property {string} measureCompleted
 * @property {string} materialListReceived
 * @property {string} dateOrdered
 * @property {string} vendor
 * @property {string} materialETA
 * @property {string} materialsIn
 * @property {string} crew
 * @property {string} scheduledInstallDate
 * @property {string} completionDate
 * @property {Record<string, string>} specs
 * @property {string} notes
 */

/**
 * @typedef {Object} ChangeOrder
 * @property {number|string} id
 * @property {string} date
 * @property {string} description
 * @property {number} amount
 */

/**
 * @typedef {Object} ProjectRecord
 * @property {string} id
 * @property {string} customer
 * @property {string} city
 * @property {string} region
 * @property {string} phone
 * @property {string} dateSold
 * @property {string} salesperson
 * @property {string} leadSource
 * @property {string} paymentType
 * @property {number|string} originalAmount
 * @property {number|string} deposit
 * @property {boolean} collected
 * @property {boolean} thankYouSent
 * @property {boolean} cancelled
 * @property {string} cancellationDate
 * @property {string} cancellationReason
 * @property {ChangeOrder[]} changeOrders
 * @property {Object} intake
 * @property {Object} permits
 * @property {string} notes
 * @property {string} decisionNeeded
 * @property {ProjectScope[]} scopes
 */

/**
 * @typedef {Object} SalesActivity
 * @property {number} leads
 * @property {number} opportunities
 */

/**
 * @typedef {Object} DashboardUserProfile
 * @property {string} id
 * @property {string} displayName
 * @property {string} email
 * @property {'owner'|'business_admin'|'operations_admin'|'sales_manager'|'salesperson'|'production_manager'|'viewer'|'wallboard'|'developer_support'} role
 * @property {'active'|'inactive'|'invited'} status
 */

export const PROJECT_MODEL_VERSION = 'phase-2-jsdoc-v1';
