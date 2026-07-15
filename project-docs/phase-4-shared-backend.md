# Phase 4 Shared Backend and Database Implementation

## Purpose

Phase 4 implements the shared backend foundation required to move the MLB Dashboard from single-browser prototype storage to secure, multi-user production data.

The selected backend is Supabase/Postgres because it provides:

- Relational data integrity.
- SQL migrations.
- Local development.
- Authentication integration.
- Row Level Security.
- Realtime change notifications.
- Hosted backups and Postgres-compatible export/restore paths.

Phase 4 does not remove the existing local-storage prototype path. Instead, it introduces a guarded provider architecture and uses local storage as an immediate cache while the shared backend is configured and authenticated.

## Foundation Review and Cleanup

Before implementing shared storage, the Phase 3 data boundary was reviewed.

The following foundations were confirmed:

- The active UI still consumes nested legacy project records.
- Legacy record normalization is isolated in `src/domain/legacyProjectAdapter.js`.
- The production model is normalized and versioned at `3.0.0`.
- Bidirectional conversion is required until the UI is migrated to the normalized model.

One compatibility gap was identified and corrected:

- The prototype `thankYouSent` closeout flag was not represented in the Phase 3 job model.
- A compatibility database column and mapper support were added so closed jobs do not reopen after a shared-backend round trip.

## Backend Architecture

### Provider strategy

The application now supports two production repository providers:

| Provider | Purpose |
|---|---|
| `local` | Default prototype mode and offline-safe fallback |
| `supabase` | Shared Postgres database and realtime synchronization |

The provider is selected through:

```txt
VITE_DATA_PROVIDER
```

The application remains in local mode unless Supabase is explicitly selected and fully configured.

### Browser configuration

Browser-safe values:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_ENABLE_REALTIME
VITE_SHARED_SYNC_DEBOUNCE_MS
```

Server and CLI secrets are explicitly excluded from the browser bundle.

## Database Schema

The Phase 4 migrations create these tables:

- `customers`
- `leads`
- `jobs`
- `work_scopes`
- `change_orders`
- `team_members`
- `crews`
- `user_profiles`
- `status_events`
- `activity_logs`
- `import_runs`
- `app_settings`

Migration files:

```txt
supabase/migrations/20260715000100_phase4_initial_schema.sql
supabase/migrations/20260715000200_add_job_closeout_flag.sql
```

### Relational integrity

The schema enforces:

- Customer-to-lead relationships.
- Customer-to-job relationships.
- Lead-to-job relationships.
- Salesperson/team-member attribution.
- Job-to-work-scope relationships.
- Job-to-change-order relationships.
- Optional work-scope-specific change orders.
- Crew and measurer relationships.
- Auth account to user-profile linkage.
- User attribution for status events, activities, imports, and approvals.

A database trigger prevents a change order from referencing a work scope that belongs to a different job.

### Shared metadata

Production records preserve:

- Model version.
- Lifecycle status.
- Source system.
- Synchronization state.
- External IDs.
- Creation and update timestamps.
- User attribution.
- Revision number.

Update triggers automatically refresh `updated_at` and increment record revision numbers.

### Indexes

Indexes support:

- Customer search.
- Email lookup.
- External-ID lookup.
- Salesperson reporting.
- Lead status reporting.
- Job sold-date reporting.
- Production-stage filtering.
- Payment-status filtering.
- Work-scope category/stage filtering.
- JSON date/specification searches.
- Change-order lookup.
- Status and activity history.
- Import-run review.

## Security Foundation

### Anonymous access

Anonymous access to production tables is revoked.

### Row Level Security

RLS is enabled for all production and configuration tables.

Database helper functions resolve:

- Current application user.
- Current application role.
- Active-profile state.
- Business-data management permission.
- Sales-data management permission.
- Production-data management permission.
- User-management permission.

### Initial role behavior

The Phase 4 policies establish a conservative baseline:

- Active authenticated users can read operational data.
- Wallboard users are read-only.
- Business and operational management roles can write appropriate business data.
- Sales management roles can manage customer and lead data.
- Production management roles can manage work scopes.
- Owner/business-admin roles manage users and destructive actions.
- Status events and activity logs are append-only for normal authenticated users.

Phase 5 will add the complete authentication UI and refine permission behavior.

## Data-Health and Administration Tools

The migration creates:

```txt
public.v_backend_dataset_counts
public.v_data_quality_issues
public.get_backend_status()
```

The data-quality view currently identifies:

- Jobs without work scopes.
- Completed jobs that remain unpaid.
- Active user profiles without auth accounts.
- Active scopes with no measurer or crew assignment.

### Hidden backend administration panel

Open with:

```txt
?backendAdmin=1
```

The panel provides:

- Backend provider and availability.
- Authentication status.
- Record counts.
- Data-quality issue review.
- Explicit empty-backend bootstrap.
- Validated production JSON export.

The panel is not shown in normal operator navigation.

## Repository and Service Layer

### Configuration

```txt
src/config/backendConfig.js
```

Validates provider selection, required environment values, realtime configuration, and synchronization debounce timing.

### Supabase client

```txt
src/services/supabaseClient.js
```

Creates one browser client using the publishable key and persistent authenticated session.

### Error handling

```txt
src/services/backendErrors.js
```

Provides structured backend errors with:

- Error code.
- Operation.
- Provider.
- Recoverability.
- Cause and details.

### Repository implementations

```txt
src/services/repositories/localProductionRepository.js
src/services/repositories/supabaseProductionRepository.js
src/services/repositories/supabaseMappers.js
src/services/productionRepository.js
```

Both providers support:

- Health checks.
- Dataset loading.
- Dataset saving.
- Data-quality review.
- Change subscriptions.

The Supabase repository performs ordered upserts so foreign-key dependencies are respected.

Phase 4 does not perform destructive synchronization. Missing local records are not automatically deleted from the shared database.

## Legacy UI Compatibility Bridge

### Production to legacy

```txt
src/domain/productionToLegacy.js
```

Converts normalized shared records into the nested project structure used by the active prototype.

### Legacy to production

```txt
src/domain/legacyToProduction.js
```

Converts local prototype records into the normalized production dataset.

### Shared synchronization service

```txt
src/services/sharedProjectStorage.js
```

Protections include:

1. No remote write before shared hydration completes.
2. No automatic bootstrap of an empty remote database.
3. Structured fallback when authentication is missing.
4. Dataset validation before writes.
5. Debounced saves.
6. Realtime refresh.
7. Comparison before remounting to prevent sync loops.
8. Local cache preservation when remote operations fail.

### App wrapper integration

```txt
src/app/MLBDashboard.jsx
```

The wrapper—not the large dashboard component—owns Phase 4 synchronization.

This protects the stabilized prototype and avoids introducing backend concerns into the large legacy component.

## Local Development

Configuration:

```txt
supabase/config.toml
supabase/seed.sql
.env.example
```

Commands:

```bash
npm install
npm run supabase:start
npm run db:reset
npm run db:lint
npm run dev
```

## Backup and Recovery

Scripts:

```txt
scripts/backup-database.sh
scripts/restore-database.sh
```

Backup output is ignored by Git.

The restore script requires:

```txt
ALLOW_DATABASE_RESTORE=true
```

This prevents accidental restores into an unconfirmed database.

## Environment Strategy

Use three separate environments:

1. Local Supabase for development and automated validation.
2. Shared development Supabase project for UAT.
3. Production Supabase project for live MLB records.

Development and production must not share a database.

## CI and Deployment

### Backend validation

```txt
.github/workflows/backend-ci.yml
```

Validates:

- npm dependency installation.
- React production build.
- Local Supabase startup.
- Migration application.
- Seed application.
- Database lint.

### Lockfile refresh

```txt
.github/workflows/refresh-lockfile.yml
```

Refreshes and commits `package-lock.json` when `package.json` changes.

### GitHub Pages deployment

The deployment workflow now accepts:

- `VITE_DATA_PROVIDER` repository variable.
- `VITE_SUPABASE_URL` secret.
- `VITE_SUPABASE_PUBLISHABLE_KEY` secret.
- `VITE_ENABLE_REALTIME` repository variable.

Local mode remains the default.

## Production Activation Sequence

Phase 4 code is implemented, but the live shared backend should be activated in this sequence:

1. Create separate development and production Supabase projects.
2. Apply migrations to development.
3. Complete Phase 5 authentication.
4. Create initial owner/admin profiles.
5. Validate RLS with each user role.
6. Open `?backendAdmin=1`.
7. Review backend status and data quality.
8. Bootstrap the empty development backend.
9. Run UAT with representative jobs.
10. Back up local/historical data.
11. Apply reviewed migrations to production.
12. Bootstrap or import production data through a controlled process.
13. Enable `VITE_DATA_PROVIDER=supabase` in the production deployment.

## Known Limitations After Phase 4

1. No live Supabase project credentials are committed or configured.
2. Authentication UI is not implemented until Phase 5.
3. Existing local users are not yet linked to `auth.users`.
4. The active dashboard still uses nested project records through a compatibility bridge.
5. Shared synchronization uses upserts and does not archive records deleted locally.
6. Full conflict resolution is not implemented.
7. Automatic audit-log generation is deferred.
8. JobNimbus and accounting integrations remain deferred.
9. The new CI workflows must complete successfully after GitHub runs them.
10. The generated lockfile refresh commit must be confirmed.

## Phase 4 Production Gate

Phase 4 code is complete when:

- The database schema and migrations exist.
- Local development can reset and seed the backend.
- RLS and security helpers exist.
- Shared repository implementations exist.
- Bidirectional legacy compatibility exists.
- Realtime synchronization is guarded.
- Backup and restore procedures exist.
- Admin record review exists.
- CI validates migrations and the application build.

Operational activation still depends on Phase 5 authentication and environment credentials. The dashboard remains safe in local mode until those requirements are met.
