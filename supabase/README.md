# MLB Dashboard Supabase Backend

This directory contains the Phase 4 shared-backend implementation for the MLB Dashboard.

## Architecture

The selected production backend is Supabase/Postgres.

It provides:

- A relational Postgres database.
- Versioned SQL migrations.
- Local Docker-based development.
- Authentication integration for Phase 5.
- Row Level Security.
- Realtime change notifications.
- Database backup and restore support.

The current React prototype continues to use local storage as an immediate cache. Shared synchronization activates only when:

1. `VITE_DATA_PROVIDER=supabase`.
2. The Supabase URL and publishable key are configured.
3. The browser has an authenticated Supabase session.
4. That authentication account is linked to an active `user_profiles` record.
5. The shared database already contains jobs, or an administrator explicitly bootstraps it.

## Local development

Prerequisites:

- Node.js.
- npm.
- A Docker-compatible container runtime.
- PostgreSQL client tools for manual backups and restores.

Install and start:

```bash
npm install
npm run supabase:start
npm run db:reset
npm run db:lint
npm run dev
```

The local Supabase dashboard is configured at:

```txt
http://127.0.0.1:54323
```

Stop the local stack:

```bash
npm run supabase:stop
```

## Database migrations

Migrations are stored in:

```txt
supabase/migrations/
```

Current migrations:

- `20260715000100_phase4_initial_schema.sql`
- `20260715000200_add_job_closeout_flag.sql`

The initial migration creates:

- Customers.
- Leads.
- Jobs.
- Work scopes.
- Change orders.
- Team members.
- Crews.
- User profiles.
- Status events.
- Activity logs.
- Import runs.
- App settings.
- Foreign keys and indexes.
- Record revision triggers.
- RLS helper functions and policies.
- Data-health views.
- Backend-status RPC.
- Realtime publication entries.

## Seed data

Local development seed data is stored in:

```txt
supabase/seed.sql
```

The seed uses clearly labeled demo records and invalid example email domains. Do not treat seed data as live MLB records.

Resetting the local database reapplies all migrations and seed data:

```bash
npm run db:reset
```

## Environment separation

Use separate Supabase projects for development and production.

Recommended environments:

| Environment | Purpose |
|---|---|
| Local | Developer migrations, seed data, and automated validation |
| Development | Shared testing and user acceptance |
| Production | Live MLB operational records |

Do not point local development at the production database.

Browser environment variables:

```txt
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_ENABLE_REALTIME=true
```

Server/CLI-only values must never use the `VITE_` prefix:

```txt
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

The service-role key must never be placed in a browser environment variable or committed to Git.

## Applying migrations to a remote project

After creating the target Supabase project:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:push
```

Apply migrations to development first. Validate the application and data model before applying the same reviewed migrations to production.

## Authentication dependency

The database is intentionally not open to anonymous users.

RLS permits operational access only to authenticated accounts linked to active application profiles. Phase 5 will implement:

- Login and logout.
- Invitation acceptance.
- Password reset.
- Auth-to-profile linkage.
- User management.
- More detailed role enforcement.

Until Phase 5 is active, the deployed dashboard remains in local mode unless an authenticated test account and active profile are configured manually.

## Initial bootstrap

The shared database is never populated automatically from browser local storage.

After authentication and profile setup:

1. Open the dashboard with `?backendAdmin=1`.
2. Confirm the backend is available and authenticated.
3. Review record counts and data-quality issues.
4. Choose **Bootstrap Empty Backend**.
5. Confirm the operation.

Bootstrap is blocked when shared jobs already exist unless a future controlled migration explicitly allows replacement.

## Admin review

Open the hidden backend administration panel by adding:

```txt
?backendAdmin=1
```

The panel supports:

- Backend health review.
- Authentication-state review.
- Record counts.
- Data-quality issue review.
- Explicit empty-backend bootstrap.
- Validated production-dataset JSON export.

The panel is hidden from normal operator navigation and database RLS remains the security boundary.

## Backup and restore

Create a custom-format Postgres backup:

```bash
DATABASE_URL='...' bash scripts/backup-database.sh
```

Restore only after confirming the target database:

```bash
DATABASE_URL='...' \
BACKUP_FILE='backups/mlb-dashboard-YYYYMMDDTHHMMSSZ.dump' \
ALLOW_DATABASE_RESTORE=true \
bash scripts/restore-database.sh
```

Backup output is excluded from Git.

## CI validation

The backend validation workflow:

1. Reconciles package-lock metadata.
2. Runs `npm ci`.
3. Builds the React application.
4. Starts local Supabase.
5. Resets the database.
6. Applies migrations and seed data.
7. Lints the database.
8. Stops Supabase.

Workflow file:

```txt
.github/workflows/backend-ci.yml
```
