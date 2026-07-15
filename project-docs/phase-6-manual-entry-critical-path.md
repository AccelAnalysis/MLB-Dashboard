# Phase 6 Normalized Project-File Workflow

## Purpose

Phase 6 provides a production-oriented manual workflow for Major League Builders before JobNimbus and accounting integrations are complete.

The normalized backend is retained, but operators do not use a separate Critical Path Entry workspace. The existing project-file experience is the sole visible entry path:

```txt
New Project -> Open File -> Edit Project -> Save Project File
```

This avoids duplicate data-entry areas while preserving the production data model, validation, permissions, revision protection, history, and future integration readiness added during Phase 6.

## Operational outcome

Authorized users create and maintain customer work through the existing project modal. A successful project-file save automatically reconciles the nested compatibility record into normalized collections:

```txt
customers
leads
jobs
workScopes
changeOrders
teamMembers
crews
statusEvents
activityLogs
```

The normalized dataset remains authoritative. After a normalized save, the application projects the backend records back into the nested format consumed by the existing Customer, Book, Meeting, Bottleneck, Sales, and Wallboard views.

## Visible workflow

### New Project

The existing New Project button creates the initial project file. The user can enter:

- Customer name, city, region, and phone.
- Date sold, salesperson, lead source, and payment type.
- Contract amount and deposit.
- Intake checklist and permits.
- General notes and decisions needed.
- One or more work scopes.
- Change orders and closeout information.

Saving creates the linked normalized customer, lead, job, scope, crew, and change-order records needed by the backend.

### Open File and Edit Project

Clicking a customer, project, Book row, or work scope opens the same project file. Changes are reconciled into the existing normalized records rather than creating parallel records.

The UI remains familiar to MLB users while the backend maintains stable entity IDs and revision numbers.

## Removed interface

The following separate entry mechanisms are intentionally retired:

- The Critical Path Entry item in account/tools controls.
- The full-screen `ManualEntryPanel` interface.
- The `?manualEntry=1` entry route.
- The separate New Sold Job action contained inside that workspace.

The manual-entry domain and service modules remain in the repository as reusable backend infrastructure and reference logic. They are not mounted as an operator-facing screen.

## Save architecture

`saveProjects()` remains the immediate compatibility-cache boundary used by the existing dashboard. An authorized user save now emits a project-workflow event containing:

- The newly saved project collection.
- The previous project collection.
- The workflow source and timestamp.

`legacyWorkflowSyncService` then:

1. Loads the latest normalized dataset.
2. Converts the compatibility projects into normalized candidate records.
3. Identifies only created, changed, removed, or archived projects and scopes.
4. Preserves stable normalized IDs.
5. Checks hidden expected revisions when available.
6. Applies normalized customer, lead, job, scope, financial, permit, and closeout changes.
7. Archives removed projects and scopes instead of destroying history.
8. Voids removed change orders.
9. Appends status events and activity records.
10. Validates the complete production dataset.
11. Saves only changed normalized collections.
12. Rebuilds the compatibility cache and refreshes all existing views.

Internal refreshes and remote hydration use forced saves and do not recursively trigger another normalized sync.

## Hidden compatibility metadata

Normalized records are projected into the project file with private `_production` metadata. This metadata is not shown in the interface and includes:

- Job ID and revision.
- Customer ID and revision.
- Lead ID and revision.
- Scope IDs and revisions.
- Change-order IDs and revisions.

The existing project editor preserves unknown record properties, so this metadata travels through Open File saves without requiring changes to the large legacy component.

## Revision and conflict protection

When a project file contains expected normalized revisions, the sync service compares them with the latest backend records before saving.

If another user changed the record after the file was opened:

- The normalized save is rejected.
- The latest backend projection is restored to the compatibility cache.
- The user receives a visible message instructing them to reopen the file.

The legacy UI does not silently overwrite a newer normalized record.

## Validation and rollback

The backend validates the full normalized dataset before persistence. Invalid changes are rejected and the latest valid normalized projection is restored.

Validation includes the Phase 3 production dataset rules and Phase 6 database constraints, including nonnegative financial values, valid relationships, cancellation details, record statuses, and scope data quality.

## Record lifecycle

The project-file workflow preserves history:

- Removing a project from active use archives the normalized job and scopes.
- Removing a scope archives the scope.
- Removing a change order changes its state to void.
- Existing status and activity records remain append-only.
- Archived normalized records are excluded from active dashboard projections.

## Permissions

The existing runtime authorization layer evaluates the difference between the previous and new project collections before the compatibility save is accepted.

The normalized sync also requires project-creation or business, sales, production, or financial data-management authority. Read-only and Wallboard users cannot persist changes.

## Initialization

At application startup, the production repository is loaded before normal editing begins.

When the normalized dataset is empty and legacy projects exist, the system performs a one-time conversion and saves the baseline normalized records. The resulting compatibility projection includes the hidden normalized metadata needed by later edits.

When normalized data already exists, it is projected into the existing dashboard interface.

## Automated verification

Run:

```bash
npm run phase6:verify
npm run build
```

The Phase 6 verification checks:

- Manual-entry validation and financial calculations.
- Critical Path date chronology.
- Archive exclusion from active projections.
- Normalized job summaries.
- Compatibility projection behavior.
- Hidden job, customer, lead, scope, and change-order IDs and revisions.
- Thank-you status preservation.

The backend CI workflow runs the verification command before the application build and Supabase migration tests.

## Non-goals

This consolidation does not:

- Implement JobNimbus synchronization.
- Implement accounting synchronization.
- Replace the existing display components with normalized-native components.
- Add permanent record deletion.
- Add salesperson ownership-scoped editing.
- Enable region-based database row filtering.
- Implement bulk historical import.

Those areas remain assigned to later production phases.
