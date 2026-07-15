import { PRODUCTION_MODEL_VERSION } from '../domain/modelVersion';

/**
 * Phase 3 production model reference.
 *
 * Runtime construction, normalization, migration, and validation live under
 * `src/domain/`. These typedefs document the normalized contracts while the
 * repository remains JavaScript-first.
 */

/**
 * @typedef {Object} RecordMetadata
 * @property {string} id
 * @property {string} modelVersion
 * @property {'active'|'completed'|'closed'|'cancelled'|'archived'} recordStatus
 * @property {'dashboard'|'jobnimbus'|'spreadsheet'|'manual_import'|'accounting'|'calculated'} sourceSystem
 * @property {'local_only'|'imported'|'synced'|'conflict'|'error'} syncState
 * @property {Record<string, string>} externalIds
 * @property {string} createdAt
 * @property {string} createdBy
 * @property {string} updatedAt
 * @property {string} updatedBy
 * @property {number} revision
 */

/**
 * @typedef {RecordMetadata & Object} CustomerRecord
 * @property {string} displayName
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} companyName
 * @property {string} phone
 * @property {string} email
 * @property {{line1:string,line2:string,city:string,county:string,state:string,postalCode:string}} address
 * @property {string} notes
 * @property {string[]} tags
 */

/**
 * @typedef {RecordMetadata & Object} LeadRecord
 * @property {string} customerId
 * @property {string} assignedSalespersonId
 * @property {string} source
 * @property {string} receivedAt
 * @property {'new'|'assigned'|'appointment_set'|'pitched'|'sold'|'lost'|'cancelled'} status
 */

/**
 * @typedef {RecordMetadata & Object} JobRecord
 * @property {string} customerId
 * @property {string} leadId
 * @property {string} salespersonId
 * @property {string} region
 * @property {string} soldDate
 * @property {string} productionStage
 * @property {string} paymentStatus
 * @property {number} originalContractAmount
 * @property {number} finalAmount
 * @property {number} depositAmount
 * @property {number} amountPaid
 * @property {number} balanceDue
 * @property {string} cancelledAt
 * @property {string} cancellationReason
 * @property {Object} intake
 * @property {Object} permit
 */

/**
 * @typedef {RecordMetadata & Object} WorkScopeRecord
 * @property {string} jobId
 * @property {string} category
 * @property {string} productionStage
 * @property {string} measurerId
 * @property {string} crewId
 * @property {string} vendor
 * @property {{measureRequested:string,measured:string,materialListReceived:string,materialsOrdered:string,materialEta:string,materialsReceived:string,scheduledInstall:string,started:string,completed:string}} dates
 * @property {Record<string, string>} specs
 * @property {string} notes
 */

/**
 * @typedef {RecordMetadata & Object} ChangeOrderRecord
 * @property {string} jobId
 * @property {string} workScopeId
 * @property {'draft'|'pending_approval'|'approved'|'rejected'|'void'} status
 * @property {string} requestedAt
 * @property {string} approvedAt
 * @property {string} description
 * @property {number} amount
 */

/**
 * @typedef {RecordMetadata & Object} UserProfileRecord
 * @property {string} displayName
 * @property {string} email
 * @property {'owner'|'business_admin'|'operations_admin'|'sales_manager'|'salesperson'|'production_manager'|'viewer'|'wallboard'|'developer_support'} role
 * @property {'active'|'inactive'|'invited'} status
 * @property {string} teamMemberId
 * @property {string[]} regionAccess
 */

/**
 * @typedef {Object} ProductionDataset
 * @property {string} schema
 * @property {string} modelVersion
 * @property {string} exportedAt
 * @property {CustomerRecord[]} customers
 * @property {LeadRecord[]} leads
 * @property {JobRecord[]} jobs
 * @property {WorkScopeRecord[]} workScopes
 * @property {ChangeOrderRecord[]} changeOrders
 * @property {Object[]} statusEvents
 * @property {Object[]} activityLogs
 * @property {UserProfileRecord[]} users
 * @property {Object[]} teamMembers
 * @property {Object[]} crews
 * @property {Object[]} importRuns
 */

export const PROJECT_MODEL_VERSION = PRODUCTION_MODEL_VERSION;
