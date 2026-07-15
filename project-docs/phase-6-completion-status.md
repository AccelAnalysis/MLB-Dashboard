# Phase 6 Completion Status

## Repository state

Phase 6 is implemented on `main`.

Checkpoint branch:

```txt
phase-6-manual-critical-path
```

## Canonical implementation

### Domain and validation

```txt
src/domain/manualEntry.js
src/domain/productionToLegacy.js
```

### Entry workflow

```txt
src/components/production/ManualEntryPanel.jsx
src/services/manualEntryService.js
src/app/MLBDashboard.jsx
src/components/auth/AccountControl.jsx
```

### Repository behavior

```txt
src/services/repositories/localProductionRepository.js
src/services/repositories/supabaseProductionRepository.js
```

### Database

```txt
supabase/migrations/20260715000900_phase6_manual_critical_path.sql
```

### Validation and operations

```txt
scripts/verify-phase6-manual-entry.mjs
.github/workflows/backend-ci.yml
project-docs/phase-6-manual-entry-critical-path.md
```

## Completed capabilities

- Searchable manual Critical Path workspace.
- New sold-job intake.
- Existing normalized record maintenance.
- Customer and contact entry.
- Salesperson and lead-source attribution.
- Region and location entry.
- Job production stages.
- Intake checklist.
- Permit tracking.
- Multi-scope work records.
- Measure, order, material, scheduling, start, and completion dates.
- Measurer and crew assignment.
- Work-order specifications.
- Scope notes and job notes.
- Original, revised, and final amount tracking.
- Change-order ledger.
- Payment, funding, collection, closeout, and cancellation fields.
- Role-disabled sections.
- Service-layer permission enforcement.
- Revision conflict detection.
- Status-event history.
- Activity history.
- Archive/void instead of destructive deletion.
- Immediate refresh of existing Book, meeting, dashboard, and Wallboard views.
- Local legacy-to-normalized bootstrap.
- Append-only history-safe Supabase persistence.
- Database readiness view and status RPC.
- Phase 6 verification command and CI step.

## Remaining verification

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

## Manual smoke test

1. Open the operator dashboard.
2. Open account controls.
3. Choose Critical Path Entry.
4. Confirm existing records load.
5. Search by customer, city, scope, and stage.
6. Create a new sold job with at least one scope.
7. Confirm the job appears in the Customer view.
8. Confirm the scope appears in the Critical Path Book.
9. Confirm it appears in the meeting and Wallboard stages.
10. Edit measure and material dates.
11. Add an approved change order.
12. Confirm revised and final amounts update.
13. Enter completion and collection dates.
14. Confirm closeout behavior.
15. Archive a scope and confirm it leaves active views.
16. Refresh and confirm records remain.
17. Test a Sales Manager account.
18. Test a Production Manager account.
19. Test a read-only account.
20. Open the same record in two browser sessions and confirm revision conflict handling.

## Known limitations

- The current display views still use the nested compatibility projection.
- Supabase collection writes use ordered REST operations rather than one multi-entity database transaction.
- Salesperson ownership-scoped editing remains deferred.
- Region assignments are not yet database row filters.
- Permanent deletion remains intentionally excluded.
- Bulk historical import remains assigned to Phase 10.
- JobNimbus integration remains assigned to Phase 11.
- Full record lifecycle and retention rules remain assigned to Phase 12.

## Phase 6 gate

Phase 6 code implementation is complete when the repository build, domain verification, database reset/lint, and role-based manual smoke test pass.

Production use remains gated by:

- Supabase development deployment.
- Role-by-role user acceptance testing.
- Email and authentication activation from Phase 5.
- Controlled shared-data bootstrap.
- MLB approval of required fields and Critical Path terminology.
- Backup confirmation before first live entry.
