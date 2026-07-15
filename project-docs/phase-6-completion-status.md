# Phase 6 Completion Status

## Repository state

Phase 6 is implemented on `main` and has been consolidated into the existing project-file workflow.

The separate Critical Path Entry screen has been removed. Operators now use one path:

```txt
New Project -> Open File -> Edit Project -> Save Project File
```

## Canonical implementation

### Domain and compatibility

```txt
src/domain/manualEntry.js
src/domain/legacyToProduction.js
src/domain/productionToLegacy.js
src/domain/validation.js
```

### Active entry workflow

```txt
src/MLBDashboard_field_complete.jsx
src/services/projectStorage.js
src/services/legacyWorkflowSyncService.js
src/app/MLBDashboard.jsx
```

### Preserved backend infrastructure

```txt
src/services/manualEntryService.js
src/services/productionRepository.js
src/services/repositories/localProductionRepository.js
src/services/repositories/supabaseProductionRepository.js
```

### Removed operator interface

```txt
src/components/production/ManualEntryPanel.jsx
```

The component was deleted and is no longer mounted. The account/tools control no longer exposes Critical Path Entry, and `?manualEntry=1` is removed from the URL on application startup.

### Database

```txt
supabase/migrations/20260715000900_phase6_manual_critical_path.sql
```

The migration and normalized tables remain in place. No destructive migration rollback was performed.

### Validation and operations

```txt
scripts/verify-phase6-manual-entry.mjs
.github/workflows/backend-ci.yml
project-docs/phase-6-manual-entry-critical-path.md
```

## Completed capabilities

- One visible project-entry and maintenance workflow.
- Normalized customer, lead, job, work-scope, team-member, crew, and change-order persistence behind the existing UI.
- Automatic conversion from compatibility projects to normalized records.
- Automatic projection from normalized records back to all existing views.
- Stable normalized IDs carried privately through project files.
- Job, customer, lead, scope, and change-order revision metadata.
- Stale-edit detection with restoration of the latest backend state.
- Dataset validation before normalized persistence.
- Customer and contact entry supported by the existing modal.
- Salesperson and lead-source attribution.
- Region and location entry.
- Job production stages derived from scope progress.
- Intake checklist and permit tracking.
- Multi-scope work records.
- Measure, order, material, scheduling, start, and completion dates.
- Measurer and crew assignment.
- Work-order specifications.
- Scope notes and job notes.
- Original and revised amount tracking.
- Change-order ledger.
- Deposit, collection, cancellation, and closeout handling.
- Runtime authorization before compatibility saves.
- Normalized permission check before backend sync.
- Status-event history.
- Activity history.
- Archive/void instead of destructive deletion.
- Immediate refresh of Customer, Book, Meeting, Bottleneck, Sales, and Wallboard views.
- Local legacy-to-normalized bootstrap.
- Append-only history-safe Supabase persistence.
- Database readiness view and status RPC retained.
- Phase 6 verification command and CI step.

## Important design result

Phase 6 no longer asks users to decide between two editors. The existing project file is the operator experience; the normalized Phase 6 model is the backend implementation.

## Manual smoke test

1. Open the operator dashboard.
2. Confirm the account/tools menu does not contain Critical Path Entry.
3. Add `?manualEntry=1` to the URL and reload; confirm the flag is removed and no entry workspace opens.
4. Choose New Project.
5. Enter customer, sale, intake, financial, and scope information.
6. Save the project file.
7. Confirm the project appears in Customer view.
8. Confirm each scope appears in the Critical Path Book.
9. Confirm the project appears in Meeting, Bottleneck, Sales, and Wallboard views as appropriate.
10. Reopen the project through Open File.
11. Edit measure, material, scheduling, and completion dates.
12. Add an approved change order and confirm the revised total updates.
13. Mark the project collected and confirm closeout behavior.
14. Remove a scope and confirm it leaves active views while remaining archived in normalized history.
15. Remove a change order and confirm it becomes void rather than disappearing from normalized history.
16. Refresh and confirm records remain.
17. Inspect normalized records and confirm stable IDs and increasing revisions.
18. Confirm status events and activity logs were appended.
19. Open the same project in two sessions, save a change in one, then attempt to save the stale file in the other.
20. Confirm the stale save is rejected and the latest backend state is restored.
21. Test Owner, Business Administrator, Operations Administrator, Sales Manager, Production Manager, and read-only roles.

## Automated verification

The following must pass through GitHub Actions or a local environment:

```bash
npm ci
npm run backend:check
npm run phase6:verify
npm run build
npm run supabase:start
npm run db:reset
npm run db:lint
npm run auth:bootstrap-local
npm run auth:verify-local
npm run supabase:stop
```

## Known limitations

- Existing display and editor components still consume the nested compatibility projection.
- Supabase collection writes use ordered REST operations rather than one multi-entity database transaction.
- The project modal does not expose every normalized-only field previously shown in the retired workspace, such as alternate phone, email, county, campaign, explicit payment status, and final-amount override.
- Salesperson ownership-scoped editing remains deferred.
- Region assignments are not yet database row filters.
- Permanent deletion remains intentionally excluded.
- Bulk historical import remains assigned to Phase 10.
- JobNimbus integration remains assigned to Phase 11.
- Full record lifecycle and retention rules remain assigned to Phase 12.

## Phase 6 gate

Phase 6 consolidation is complete when:

- The duplicate interface and route remain absent.
- New Project and Open File saves reach the normalized backend.
- Compatibility views refresh from normalized records.
- Revision conflicts restore the latest backend state.
- The repository build and domain verification pass.
- Database reset/lint and role-based smoke testing pass.

Production use remains gated by:

- Supabase development deployment.
- Role-by-role user acceptance testing.
- Email and authentication activation from Phase 5.
- Controlled shared-data bootstrap.
- MLB approval of required fields and terminology.
- Backup confirmation before first live entry.
