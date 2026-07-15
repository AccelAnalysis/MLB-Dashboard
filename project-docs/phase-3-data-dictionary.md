# Phase 3 Data Dictionary

## Conventions

- Dates are stored as ISO-8601 strings.
- Currency amounts are stored as numeric values in U.S. dollars for the current implementation. A later backend may store integer cents.
- Foreign-key fields use normalized record IDs.
- Empty optional text values normalize to an empty string.
- Imported records retain source-system identifiers in `externalIds`.
- Calculated values should not be stored unless a later reporting design explicitly requires snapshots.

## Shared Record Metadata

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `id` | string | Yes | Stable internal record identifier |
| `modelVersion` | string | Yes | Production data-contract version |
| `recordStatus` | enum | Yes | Active, completed, closed, cancelled, or archived lifecycle |
| `sourceSystem` | enum | Yes | Dashboard, JobNimbus, spreadsheet, manual import, accounting, or calculated |
| `syncState` | enum | Yes | Local-only, imported, synced, conflict, or error |
| `externalIds` | object | Yes | Source-system IDs keyed by system name |
| `createdAt` | ISO datetime | Yes | Original creation timestamp |
| `createdBy` | user ID | No | Creating user/system |
| `updatedAt` | ISO datetime | Yes | Most recent update timestamp |
| `updatedBy` | user ID | No | Most recent updating user/system |
| `revision` | number | Yes | Optimistic-concurrency revision |

## Customer

| Field | Type | Required | Source/Authority | Purpose |
|---|---|---:|---|---|
| `displayName` | string | Yes | JobNimbus, dashboard fallback | Primary customer label |
| `firstName` | string | No | JobNimbus/dashboard | Individual first name |
| `lastName` | string | No | JobNimbus/dashboard | Individual last name |
| `companyName` | string | No | JobNimbus/dashboard | Business customer name |
| `phone` | string | No | JobNimbus, dashboard fallback | Primary telephone |
| `alternatePhone` | string | No | Dashboard | Secondary telephone |
| `email` | string | No | JobNimbus, dashboard fallback | Primary email |
| `address.line1` | string | No | JobNimbus/dashboard | Street address |
| `address.line2` | string | No | JobNimbus/dashboard | Supplemental address |
| `address.city` | string | No | JobNimbus/dashboard | City reporting |
| `address.county` | string | No | Dashboard/spreadsheet | County reporting |
| `address.state` | string | No | JobNimbus/dashboard | State |
| `address.postalCode` | string | No | JobNimbus/dashboard | ZIP/postal code |
| `preferredContactMethod` | string | No | Dashboard | Phone, text, email, etc. |
| `notes` | string | No | Dashboard | Customer-level notes |
| `tags` | string[] | Yes | Dashboard | Search/reporting labels |

## Lead

| Field | Type | Required | Source/Authority | Purpose |
|---|---|---:|---|---|
| `customerId` | customer ID | Yes | Dashboard/import | Customer relationship |
| `assignedSalespersonId` | team member ID | No | JobNimbus/dashboard | Sales attribution |
| `source` | string | No | JobNimbus, spreadsheet fallback | Lead-source reporting |
| `campaign` | string | No | Dashboard/import | Campaign attribution |
| `receivedAt` | ISO date/time | No | JobNimbus/dashboard | Lead-volume periods |
| `appointmentAt` | ISO date/time | No | Dashboard/JobNimbus | Appointment measurement |
| `pitchedAt` | ISO date/time | No | Dashboard/JobNimbus | Pitch-rate measurement |
| `dispositionedAt` | ISO date/time | No | Dashboard | Sold/lost timing |
| `status` | enum | Yes | Dashboard | New through sold/lost/cancelled |
| `lostReason` | string | No | Dashboard | Sales coaching/reporting |
| `notes` | string | No | Dashboard | Lead context |

## Job

| Field | Type | Required | Source/Authority | Purpose |
|---|---|---:|---|---|
| `customerId` | customer ID | Yes | Dashboard/import | Customer relationship |
| `leadId` | lead ID | No | JobNimbus/dashboard | Lead relationship |
| `salespersonId` | team member ID | No | JobNimbus, dashboard fallback | Sales attribution |
| `region` | string | No | Dashboard/import | Virginia/Carolina reporting |
| `locationName` | string | No | Dashboard/import | City/site display |
| `soldDate` | ISO date | Yes | JobNimbus/dashboard | Sales and cycle-time anchor |
| `productionStage` | enum | Yes | Dashboard | Overall job stage |
| `paymentStatus` | enum | Yes | Dashboard/accounting | Collection/funding stage |
| `paymentType` | string | No | JobNimbus/dashboard | Cash, finance, etc. |
| `financingProvider` | string | No | Dashboard | Financing detail |
| `originalContractAmount` | number | Yes | JobNimbus/spreadsheet | Initial sold value |
| `finalAmount` | number | Yes | Dashboard/spreadsheet | True final project value |
| `depositAmount` | number | Yes | Dashboard/JobNimbus | Deposit received |
| `amountPaid` | number | Yes | Accounting/dashboard | Actual payment total |
| `balanceDue` | number | Yes | Calculated/verified | Outstanding balance |
| `fundedAt` | ISO date/time | No | Dashboard/accounting | Financing completion |
| `collectedAt` | ISO date/time | No | Dashboard/accounting | Payment completion |
| `closedAt` | ISO date/time | No | Dashboard | Operational closure |
| `cancelledAt` | ISO date/time | No | Dashboard | Cancellation timing |
| `cancellationReason` | string | No | Dashboard | Retention analysis |
| `decisionNeeded` | string | No | Dashboard | Critical Path escalation |
| `notes` | string | No | Dashboard | Job-level context |
| `intake.*` | booleans | Yes | Dashboard/JobNimbus | Contract/document/setup completion |
| `permit.*` | mixed | Yes | Dashboard | Permit requirement and dates |

## Work Scope

| Field | Type | Required | Source/Authority | Purpose |
|---|---|---:|---|---|
| `jobId` | job ID | Yes | Dashboard | Parent job |
| `category` | string | Yes | Dashboard/JobNimbus | Roof, siding, windows, etc. |
| `description` | string | No | Dashboard | Scope summary |
| `productionStage` | enum | Yes | Dashboard | Scope-specific status |
| `priority` | string | Yes | Dashboard | Operational priority |
| `measurerId` | team member ID | No | Dashboard | Assigned measurer |
| `measurerName` | string | No | Import/legacy support | Display fallback |
| `crewId` | crew ID | No | Dashboard | Assigned crew |
| `crewName` | string | No | Import/legacy support | Display fallback |
| `vendor` | string | No | Dashboard | Material supplier |
| `dates.measureRequested` | ISO date/time | No | Dashboard | Sold-to-request cycle |
| `dates.measured` | ISO date/time | No | Dashboard | Measurement cycle |
| `dates.materialListReceived` | ISO date/time | No | Dashboard | List turnaround |
| `dates.materialsOrdered` | ISO date/time | No | Dashboard | Ordering cycle |
| `dates.materialEta` | ISO date/time | No | Dashboard/vendor | Delivery expectation |
| `dates.materialsReceived` | ISO date/time | No | Dashboard | Ready-to-schedule trigger |
| `dates.scheduledInstall` | ISO date/time | No | Dashboard | Scheduled production |
| `dates.started` | ISO date/time | No | Dashboard | Work start |
| `dates.completed` | ISO date/time | No | Dashboard | Scope completion |
| `specs` | object | Yes | Dashboard/JobNimbus | Product/work-order specifications |
| `notes` | string | No | Dashboard | Scope-specific context |

## Change Order

| Field | Type | Required | Source/Authority | Purpose |
|---|---|---:|---|---|
| `jobId` | job ID | Yes | Dashboard | Parent job |
| `workScopeId` | scope ID | No | Dashboard | Optional affected scope |
| `status` | enum | Yes | Dashboard | Draft through approved/rejected/void |
| `requestedAt` | ISO date/time | No | Dashboard | Request timing |
| `approvedAt` | ISO date/time | No | Dashboard | Approval timing |
| `description` | string | Yes | Dashboard | Adjustment description |
| `reason` | string | No | Dashboard | Bad wood, customer request, etc. |
| `amount` | number | Yes | Dashboard | Contract adjustment |
| `customerApproved` | boolean | Yes | Dashboard | Approval confirmation |
| `approvedBy` | user ID | No | Dashboard | Internal approval attribution |

## Team Member

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `displayName` | string | Yes | Employee/contractor label |
| `employeeType` | string | No | Employee, contractor, subcontractor, etc. |
| `department` | string | No | Sales, production, operations |
| `salesperson` | boolean | Yes | Sales attribution eligibility |
| `productionStaff` | boolean | Yes | Production assignment eligibility |
| `active` | boolean | Yes | Current assignment availability |
| `phone` | string | No | Contact |
| `email` | string | No | Contact |
| `regionAssignments` | string[] | Yes | Region scope |

## Crew

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `name` | string | Yes | Crew display name |
| `crewType` | string | No | Internal/subcontractor classification |
| `tradeCategories` | string[] | Yes | Eligible work categories |
| `leadTeamMemberId` | team member ID | No | Crew leader |
| `active` | boolean | Yes | Assignment availability |
| `notes` | string | No | Operational notes |

## User Profile

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `displayName` | string | Yes | User display |
| `email` | string | Yes | Login identity |
| `role` | enum | Yes | Permission role |
| `status` | enum | Yes | Invited, active, inactive |
| `teamMemberId` | team member ID | No | Operational-person relationship |
| `regionAccess` | string[] | Yes | Data-access scope |
| `lastLoginAt` | ISO date/time | No | Security/admin reporting |

## Status Event

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `entityType` | string | Yes | Job, work scope, lead, etc. |
| `entityId` | record ID | Yes | Changed entity |
| `fromStatus` | string | No | Previous status |
| `toStatus` | string | Yes | New status |
| `occurredAt` | ISO date/time | Yes | Transition timestamp |
| `actorUserId` | user ID | No | User/system attribution |
| `note` | string | No | Transition explanation |
| `metadata` | object | Yes | Additional structured context |

## Activity Log

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `actorUserId` | user ID | No | User/system attribution |
| `action` | string | Yes | Created, updated, approved, imported, etc. |
| `entityType` | string | Yes | Affected entity type |
| `entityId` | record ID | Yes | Affected record |
| `occurredAt` | ISO date/time | Yes | Action timestamp |
| `reason` | string | No | Required explanation for sensitive actions |
| `changedFields` | array | Yes | Field-level change list |
| `before` | any | No | Prior snapshot/value |
| `after` | any | No | New snapshot/value |
| `context` | object | Yes | Device/import/support context |

## Import Run

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `importType` | string | No | JobNimbus, historical sales, county, etc. |
| `sourceSystem` | enum | Yes | Import source |
| `fileName` | string | No | Source file |
| `startedAt` | ISO date/time | Yes | Import start |
| `completedAt` | ISO date/time | No | Import completion |
| `initiatedBy` | user ID | No | Admin attribution |
| `rowCount` | number | Yes | Total rows |
| `acceptedCount` | number | Yes | Applied rows |
| `rejectedCount` | number | Yes | Rejected rows |
| `warnings` | array | Yes | Non-blocking findings |
| `errors` | array | Yes | Blocking findings |

## Calculated Metrics

The following should normally be calculated from source records, not stored as authoritative fields:

- Revised contract amount.
- Balance due.
- Close rate.
- Value per lead.
- Average sale.
- Cancellation/retention rate.
- Sold-to-measured duration.
- Sold-to-completed duration.
- Completed-to-collected duration.
- Active backlog value.
- Sales-versus-production variance.
- Product-category mix.
