# Phase 3 Production Data Model

## Purpose

Phase 3 defines the production data contract for the MLB Dashboard before a shared backend, authentication, role enforcement, JobNimbus synchronization, historical imports, or audit logging are implemented.

The current prototype stores a customer, job, work scopes, financial information, and production information inside one nested project record. That structure is useful for a single-browser prototype but is not sufficient for multi-user production use, reliable imports, historical reporting, audit history, or external integrations.

Phase 3 creates a normalized production domain model while preserving the current dashboard runtime.

## Foundation Cleanup Completed First

Before introducing the production entities, the existing local-storage normalization logic was removed from `src/services/projectStorage.js` and placed in:

```txt
src/domain/legacyProjectAdapter.js
```

This establishes an explicit boundary:

- The active prototype continues to use nested legacy project records.
- The storage service only handles storage and file transfer.
- The legacy adapter owns prototype-record normalization.
- The production domain owns the future normalized data contract.

The active user interface was not switched to the production model during Phase 3. That migration should occur only after the shared data-service and rollout plan are approved.

## Production Model Version

```txt
Model name: mlb-dashboard-production-model
Model version: 3.0.0
```

The version is defined in:

```txt
src/domain/modelVersion.js
```

Every normalized entity receives the production model version and shared record metadata.

## Production Entities

### Customer

Represents a person, household, or organization purchasing work.

A customer can have:

- Multiple leads.
- Multiple jobs.
- Multiple addresses or future contact records.
- Historical and active work without duplicating the customer identity.

### Lead

Represents a sales opportunity received by MLB.

A lead stores:

- Customer relationship.
- Assigned salesperson.
- Lead source and campaign.
- Received, appointment, pitch, and disposition dates.
- Sold, lost, or cancelled outcome.

This is the basis for close rate, value per lead, lead-source reporting, and salesperson scorecards.

### Job

Represents the overall sold contract/project for one customer.

A job stores:

- Customer, lead, and salesperson relationships.
- Region and sold date.
- Overall production and payment status.
- Original contract amount.
- Final project amount.
- Deposit, paid amount, and balance.
- Cancellation details.
- Intake and permit information.
- Funding, collection, closure, and management notes.

### Work Scope

Represents an independently scheduled and tracked trade or scope within a job.

Examples:

- Roof.
- Siding.
- Windows.
- Deck.
- Gutters.
- Doors.
- Trim.
- Repair.

Each work scope has its own:

- Category.
- Production stage.
- Measurer.
- Crew.
- Vendor.
- Specifications.
- Measurement, material, scheduling, start, and completion dates.
- Notes.

This allows one customer and one job to contain multiple scopes without duplicating the customer on the board.

### Change Order

Represents a controlled financial or scope adjustment.

A change order is related to:

- A required job.
- An optional work scope.
- An approval status.
- Requested and approved dates.
- Description and reason.
- Amount.
- Customer approval and approving user.

### Team Member

Represents an MLB employee or contractor for operational attribution.

A team member can be:

- A salesperson.
- Production staff.
- Both, where appropriate.

User login identity is intentionally separate from team-member identity. A salesperson can exist in historical data even if that person does not have a platform account.

### Crew

Represents an internal or subcontractor crew.

A crew stores:

- Crew name and type.
- Supported trade categories.
- Lead team member.
- Active status.

### User Profile

Represents a person or display account authenticated into the platform.

A user profile stores:

- Display name and email.
- Role.
- Active, inactive, or invited state.
- Optional team-member relationship.
- Region access.
- Last login date.

The wallboard is represented as a restricted user role rather than an anonymous editable session.

### Status Event

Represents an immutable transition in an entity's workflow.

Examples:

- Work scope moved from measured to materials ordered.
- Job moved from completed to funding pending.
- Lead moved from pitched to sold.

Status events support cycle-time calculations and historical process analysis without relying only on the current status.

### Activity Log

Represents an auditable user or system action.

Examples:

- Final amount changed.
- Salesperson reassigned.
- Change order approved.
- Record archived.
- Import completed.

Activity logs are separate from status events because many important changes do not represent a workflow-stage transition.

### Import Run

Represents one controlled spreadsheet, JobNimbus, or other data import.

An import run stores:

- Source and file name.
- Initiating user.
- Start and completion timestamps.
- Row counts.
- Accepted and rejected counts.
- Warnings and errors.

## Record Metadata

Every production entity receives:

- `id`
- `modelVersion`
- `recordStatus`
- `sourceSystem`
- `syncState`
- `externalIds`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`
- `revision`

This metadata is required for multi-user updates, imports, conflict detection, source tracking, audit history, and record lifecycle management.

## Record Identifiers

Phase 3 adds prefixed client-safe IDs through:

```txt
src/domain/recordIds.js
```

Prefixes include:

| Entity | Prefix |
|---|---|
| Customer | `CUS` |
| Job | `JOB` |
| Work scope | `SCP` |
| Lead | `LED` |
| Change order | `CO` |
| Status event | `EVT` |
| Activity | `ACT` |
| User | `USR` |
| Team member | `TMB` |
| Crew | `CRW` |
| Import run | `IMP` |

A future backend may replace the generated identifiers with UUIDs while preserving external IDs and human-readable display references.

## Status Models

Phase 3 defines controlled enums for:

- Record lifecycle.
- User lifecycle.
- User role.
- Data source.
- Synchronization state.
- Production stage.
- Payment status.
- Lead status.
- Change-order status.

Production stages include sold, measurement, materials, scheduling, in-progress, completion, funding, collection, closure, and cancellation states.

## Source-of-Truth Rules

The production model explicitly prevents an upstream system from overwriting dashboard-owned management truth.

Primary decisions include:

- JobNimbus may be authoritative for customer identity, initial job identity, original estimates, salesperson assignment, and lead source when those fields are reliable.
- The dashboard is authoritative for work-scope production stages and dates, final amount, change orders, cancellations, funding status, status events, and activity history.
- Accounting may later become authoritative for amount paid.
- Calculated metrics are never imported as stored source data.

The executable field-ownership rules are in:

```txt
src/domain/sourceOfTruth.js
```

## Validation

Phase 3 adds entity and full-dataset validation in:

```txt
src/domain/validation.js
```

Validation checks:

- Required metadata.
- Allowed enum values.
- Numeric financial fields.
- Required relationships.
- Collection shapes.
- Missing customer/job/scope references.
- Optional relationship warnings.

The validator returns structured errors and warnings rather than silently correcting broken relationships.

## Legacy Migration Bridge

Phase 3 adds:

```txt
src/domain/legacyToProduction.js
```

This converter transforms current nested prototype records into:

- Deduplicated customers.
- Leads.
- Jobs.
- Work scopes.
- Change orders.
- Sales team members.
- Crews.

It infers production and payment stages from the existing dates and completion/collection flags, then validates the resulting dataset.

The migration does not automatically replace localStorage data or switch the active UI. It is a controlled bridge for a later shared-backend migration.

## Phase 3 Files

```txt
src/domain/modelVersion.js
src/domain/enums.js
src/domain/recordIds.js
src/domain/entityFactories.js
src/domain/validation.js
src/domain/sourceOfTruth.js
src/domain/productionDataset.js
src/domain/legacyProjectAdapter.js
src/domain/legacyToProduction.js
src/domain/index.js
src/domain/README.md
src/types/projectModels.js
```

Supporting documents:

```txt
project-docs/phase-3-production-data-model.md
project-docs/phase-3-data-dictionary.md
project-docs/phase-3-entity-relationships.md
project-docs/phase-3-source-of-truth-matrix.md
```

## What Phase 3 Does Not Do

Phase 3 does not:

- Replace localStorage with a backend.
- Change the active dashboard's nested runtime records.
- Add authentication.
- Enforce roles in the UI.
- Connect JobNimbus.
- Import historical spreadsheets.
- Add a production audit-log database.
- Change dashboard views or calculations.

These capabilities now have a stable data contract to build against.

## Validation Checklist

After pulling the repository:

```bash
npm install
npm run build
npm run dev
```

Manually verify:

- The dashboard still loads.
- Existing local data still loads.
- Backup export/import still works.
- New Project still saves.
- Existing projects still edit.
- Critical Path Book still loads and exports.
- Wallboard still loads.
- No import-resolution errors appear for `projectStorage.js` or `src/domain/`.

## Phase 3 Production Gate

Phase 3 is complete when:

1. Production entities and relationships are explicitly defined.
2. Required fields and lifecycle states are documented.
3. Source ownership is explicit.
4. Record construction and normalization are executable.
5. Cross-record validation is executable.
6. The legacy nested model can be converted to the normalized model.
7. The active prototype continues to behave as before.

The next production phase can now select and implement the shared backend against this contract instead of designing database tables from the UI component file.
