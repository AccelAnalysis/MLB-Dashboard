# MLB Dashboard Supabase Backend

This directory contains the shared Supabase/Postgres backend, authentication foundation, local development configuration, migrations, Edge Functions, and operational runbooks for the MLB Dashboard.

## Architecture

The backend provides:

- Relational Postgres data integrity.
- Versioned SQL migrations.
- Local Docker-based development.
- Supabase Auth and invite-only account access.
- Row Level Security.
- Realtime change notifications.
- Edge Functions for privileged account invitations.
- Database backup and restore support.

The React dashboard continues to use local storage as an immediate compatibility cache. Shared synchronization activates only when:

1. `VITE_DATA_PROVIDER=supabase`.
2. `VITE_AUTH_MODE=supabase`.
3. The Supabase URL and publishable key are configured.
4. The browser has a valid Supabase session.
5. The authentication account is linked to an active `user_profiles` record.
6. The shared database contains jobs, or an authorized administrator explicitly bootstraps it.

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

Create a local Phase 5 owner:

```bash
LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='local-password-at-least-12-characters' \
LOCAL_OWNER_NAME='Local MLB Owner' \
npm run auth:bootstrap-local
```

Detailed authentication instructions are in:

```txt
supabase/AUTHENTICATION.md
```

Stop the local stack:

```bash
npm run supabase:stop
```

## Database migrations

Migrations are stored in `supabase/migrations/`.

Current migrations:

```txt
20260715000100_phase4_initial_schema.sql
20260715000200_add_job_closeout_flag.sql
20260715000300_bootstrap_first_owner.sql
20260715000400_phase5_authentication_roles.sql
20260715000500_phase5_user_lifecycle_guards.sql
20260715000600_phase5_invitation_metadata.sql
20260715000700_phase5_privilege_trigger_fix.sql
20260715000800_phase5_salesperson_record_scope.sql
```

Together they create or enforce:

- Customers, leads, jobs, and work scopes.
- Change orders.
- Team members and crews.
- User profiles linked to Supabase Auth.
- Status events and activity logs.
- Import runs and app settings.
- Foreign keys and indexes.
- Record revision triggers.
- RLS helper functions and policies.
- Region and salesperson record scope.
- Invite, acceptance, login, password-update, and deactivation metadata.
- Owner-role protections.
- First-owner bootstrap.
- Data-health views.
- Backend and current-user RPCs.
- Realtime publication entries.

## Authentication

The database is intentionally closed to anonymous operational access.

An authenticated Supabase account must also have an application profile with an approved role and active status.

Phase 5 implements:

- Login and logout.
- Invitation acceptance.
- Password recovery and password update.
- Auth-to-profile linkage.
- User administration.
- Role capabilities.
- Region access.
- Salesperson assignment scope.
- Wallboard-only accounts.
- Final-owner safeguards.

See:

- `AUTHENTICATION.md`
- `FIRST_OWNER.md`
- `../project-docs/phase-5-authentication-roles.md`
- `../project-docs/phase-5-role-permission-matrix.md`

## Edge Functions

The invitation function is located at:

```txt
supabase/functions/invite-user/index.ts
```

It uses a verified caller JWT and server-side service role to create an Auth invitation and linked application profile. The service-role key is never sent to the browser.

Local function configuration is declared in `supabase/config.toml`.

Remote deployment:

```bash
npx supabase link --project-ref <project-ref>
npx supabase secrets set \
  AUTH_ALLOWED_ORIGINS='https://approved-dashboard.example' \
  AUTH_INVITE_REDIRECT_URL='https://approved-dashboard.example'
npx supabase functions deploy invite-user
```

## Seed data

Local seed data is stored in:

```txt
supabase/seed.sql
```

It uses clearly labeled demo records and invalid example email domains. It is not live MLB data.

Resetting reapplies all migrations and seed data:

```bash
npm run db:reset
```

## Environment separation

Use separate Supabase projects for:

| Environment | Purpose |
|---|---|
| Local | Migrations, seed data, authentication tests, and automated validation |
| Development | Shared UAT and role testing |
| Production | Live MLB operational records |

Never point local development at production.

Browser environment variables:

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

Server/CLI-only values must not use the `VITE_` prefix:

```txt
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
AUTH_ALLOWED_ORIGINS
AUTH_INVITE_REDIRECT_URL
```

The service-role key must never be placed in a browser environment variable or committed to Git.

## Applying migrations remotely

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:push
```

Apply and test in the development project before production.

## Initial owner

The first owner must be linked through the protected bootstrap function documented in:

```txt
supabase/FIRST_OWNER.md
```

After the first owner signs in, later users should be created through the dashboard's **Users, roles, and access** panel.

## Shared-data bootstrap

The browser never automatically copies local cache data into an empty shared database.

After authentication and profile setup:

1. Sign in as an authorized administrative profile.
2. Open the account control.
3. Choose **Backend administration**.
4. Confirm backend health and record counts.
5. Choose **Bootstrap Empty Backend**.
6. Confirm the operation.

Bootstrap is blocked when shared jobs already exist.

## Administration tools

Authorized profiles can open:

```txt
?backendAdmin=1
```

for backend health, counts, quality issues, bootstrap, and JSON export.

Owner and Business Admin profiles can open:

```txt
?userAdmin=1
```

for invitations, roles, regions, team links, activation, deactivation, and recovery emails.

Database RLS and triggers remain the security boundary even when direct URLs are used.

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

`.github/workflows/backend-ci.yml` performs:

1. Lockfile reconciliation.
2. `npm ci`.
3. React production build.
4. Local Supabase startup.
5. Database reset.
6. Migration and seed application.
7. Database lint.
8. Supabase shutdown.

Before remote activation, confirm both the application build and all Phase 5 migrations pass in CI or locally.
