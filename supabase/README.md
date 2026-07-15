# MLB Dashboard Supabase Backend

This directory contains the shared Supabase/Postgres backend, authentication configuration, migrations, Edge Functions, local seed data, and production operations guidance for the MLB Dashboard.

## Architecture

The backend provides:

- Relational Postgres data integrity.
- Versioned SQL migrations.
- Local Docker-based development.
- Invitation-only Supabase Auth.
- Application profiles and role permissions.
- Row Level Security.
- Realtime change notifications.
- Edge Functions for privileged invitations.
- Database backup and restore support.

The React dashboard retains local storage as an immediate compatibility cache around the current nested legacy component. Shared operation requires both Supabase data and Supabase authentication modes.

## Local development

Prerequisites:

- Node.js and npm.
- Docker Desktop or another Docker-compatible runtime.
- PostgreSQL client tools for manual backup and restore.

Start and validate:

```bash
npm install
npm run supabase:start
npm run db:reset
npm run db:lint
```

The local Studio URL is configured as:

```txt
http://127.0.0.1:54323
```

Create or refresh a local owner:

```bash
LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='local-test-password-at-least-12-characters' \
LOCAL_OWNER_NAME='Local MLB Owner' \
npm run auth:bootstrap-local
```

Run the authenticated smoke test:

```bash
LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='local-test-password-at-least-12-characters' \
npm run auth:verify-local
```

Detailed authentication setup is documented in:

```txt
supabase/AUTHENTICATION.md
```

Stop the local stack:

```bash
npm run supabase:stop
```

## Migration order

Migrations are stored in `supabase/migrations/` and currently apply in this order:

```txt
20260715000100_phase4_initial_schema.sql
20260715000200_add_job_closeout_flag.sql
20260715000300_bootstrap_first_owner.sql
20260715000400_phase5_authentication_and_roles.sql
20260715000500_phase5_profile_self_service.sql
20260715000600_phase5_profile_function_fix.sql
```

Together they provide:

- Customers, leads, jobs, and work scopes.
- Change orders.
- Team members and crews.
- User profiles linked to Supabase Auth.
- Status events and activity logs.
- Import runs and app settings.
- Foreign keys, indexes, and record-revision triggers.
- RLS helpers and policies.
- Backend-status and data-health views.
- First-owner bootstrap.
- Invite, activation, deactivation, and last-seen metadata.
- Current-user permission context.
- Invitation activation and session-touch RPCs.
- Protected role/status administration with last-owner safeguards.
- Self-service display-name update.
- Realtime publication entries.

Do not create two migration files with the same timestamp/version prefix.

## Authentication

The database is closed to anonymous operational access.

A Supabase Auth account must also have a linked application profile. Operational access requires an active profile.

Phase 5 supports:

- Sign in and sign out.
- Password recovery.
- Invitation acceptance through password creation.
- User lifecycle administration.
- Owner safeguards.
- Role-aware browser authorization.
- Collection-scoped shared saves.
- Wallboard-only accounts.

See:

- `AUTHENTICATION.md`
- `FIRST_OWNER.md`
- `../project-docs/phase-5-authentication-and-roles.md`
- `../project-docs/phase-5-role-matrix.md`

## Invitation Edge Function

The secured invitation function is:

```txt
supabase/functions/invite-user/index.ts
```

It verifies the caller, checks the active application role, creates the Supabase Auth invitation, creates the linked invited profile, rolls back failed profile creation, and records invitation activity.

Deploy to a linked remote project:

```bash
npx supabase secrets set \
  AUTH_ALLOWED_ORIGINS='https://approved-dashboard.example' \
  AUTH_INVITE_REDIRECT_URL='https://approved-dashboard.example/?authAction=accept-invite'

npx supabase functions deploy invite-user
```

The service-role key stays inside the function environment and must never enter browser code.

## Seed data

Local development seed data is stored in:

```txt
supabase/seed.sql
```

It contains clearly labeled demo records and invalid example email domains. It is not live MLB data.

Resetting the local database reapplies all migrations and seed data:

```bash
npm run db:reset
```

## Environment separation

Use separate Supabase projects for:

| Environment | Purpose |
|---|---|
| Local | Migrations, seed data, authentication testing, and automated validation |
| Development | Shared user acceptance and role testing |
| Production | Live MLB operational records |

Never point local development at production.

Browser variables:

```txt
VITE_DATA_PROVIDER=supabase
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_AUTH_REDIRECT_URL=...
VITE_AUTH_INVITE_FUNCTION=invite-user
VITE_AUTH_PASSWORD_MIN_LENGTH=12
VITE_ENABLE_REALTIME=true
```

Server/CLI/function-only values must not use a `VITE_` prefix:

```txt
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
AUTH_ALLOWED_ORIGINS
AUTH_INVITE_REDIRECT_URL
```

## Applying migrations remotely

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:push
```

Apply and validate migrations in the development project before production.

## First owner

Follow:

```txt
supabase/FIRST_OWNER.md
```

After the first owner signs in, later users should be invited through **Users, Roles, and Access**.

## Shared-data bootstrap

The browser never automatically uploads local cache data into an empty shared database.

After authentication and profile setup:

1. Sign in as an authorized administrator.
2. Open **Backend Administration**.
3. Confirm backend health and record counts.
4. Choose **Bootstrap Empty Backend**.
5. Confirm the operation.

Bootstrap is blocked when shared jobs already exist.

## Administration entry points

Authorized accounts may open:

```txt
?backendAdmin=1
```

for backend health, counts, quality issues, bootstrap, and export.

Owner and Business Admin accounts may open:

```txt
?userAdmin=1
```

for invitations, roles, lifecycle state, regions, and team-member links.

Query parameters do not bypass role checks.

## Backup and restore

Backup:

```bash
DATABASE_URL='...' npm run db:backup
```

Guarded restore:

```bash
DATABASE_URL='...' \
BACKUP_FILE='backups/mlb-dashboard-YYYYMMDDTHHMMSSZ.dump' \
ALLOW_DATABASE_RESTORE=true \
npm run db:restore
```

Backup output is excluded from Git.

## CI validation

`.github/workflows/backend-ci.yml` validates:

1. Environment configuration.
2. npm installation.
3. React production build.
4. Local Supabase startup.
5. Database reset and migration application.
6. Database lint.
7. Protected local-owner bootstrap.
8. Publishable-key sign-in and current-user context.
9. Sign-out.
10. Supabase shutdown.

Before remote activation, confirm the workflow and local role tests pass.
