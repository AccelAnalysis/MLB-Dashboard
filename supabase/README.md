# MLB Dashboard Supabase Backend

This directory contains the shared Supabase/Postgres backend, authentication foundation, local-development configuration, migrations, Edge Functions, and operational runbooks for the MLB Dashboard.

## Architecture

The backend provides:

- Relational Postgres data integrity.
- Versioned SQL migrations.
- Local Docker-based development.
- Invitation-only Supabase Auth.
- Row Level Security.
- Realtime change notifications.
- A protected Edge Function for user invitations.
- Database backup and restore support.

The React dashboard continues to use local storage as an immediate compatibility cache. Shared synchronization activates only when:

1. `VITE_DATA_PROVIDER=supabase`.
2. `VITE_AUTH_MODE=supabase`.
3. The Supabase URL and publishable key are configured.
4. The browser has a valid Supabase session.
5. The Auth account is linked to an active `user_profiles` record.
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

Local Studio:

```txt
http://127.0.0.1:54323
```

Create the local owner:

```bash
LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='local-password-at-least-12-characters' \
LOCAL_OWNER_NAME='Local MLB Owner' \
npm run auth:bootstrap-local
```

Verify authentication:

```bash
LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='local-password-at-least-12-characters' \
npm run auth:verify-local
```

Stop the stack:

```bash
npm run supabase:stop
```

## Canonical migration sequence

Migrations are stored in `supabase/migrations/`.

```txt
20260715000100_phase4_initial_schema.sql
20260715000200_add_job_closeout_flag.sql
20260715000300_bootstrap_first_owner.sql
20260715000400_phase5_authentication_and_roles.sql
20260715000500_phase5_profile_self_service.sql
20260715000600_phase5_profile_function_fix.sql
20260715000700_phase5_user_profile_rpc_only.sql
20260715000800_phase5_password_activation_guard.sql
```

The Phase 5 migrations provide:

- Invitation, activation, deactivation, and last-seen metadata.
- Auth-account to application-profile linkage.
- Server-calculated access context.
- Invitation activation after password setup.
- Login/session recording.
- Role, status, team, and region administration.
- Last-active-owner protection.
- Activity history for access changes.
- Self-service display-name updates.
- RPC/service-role-only writes to `user_profiles`.
- Database verification that an invited account has a password before activation.

Do not create two migration files with the same timestamp/version prefix.

## Authentication

The database is closed to anonymous operational access.

An Auth account must also have an application profile. Operational data requires an active profile.

Phase 5 includes:

- Sign in and sign out.
- Invitation acceptance.
- Password recovery and update.
- User administration.
- Role capabilities.
- Team-member and region assignments.
- Wallboard-only accounts.
- Owner safeguards.

Current limitations:

- Salesperson ownership-scoped editing is deferred while the UI writes one nested legacy dataset.
- Region assignments are stored and administered, but database-level region row filtering is not yet activated.
- Optimistic conflict resolution is not yet implemented.

See:

- `AUTHENTICATION.md`
- `FIRST_OWNER.md`
- `../project-docs/phase-5-authentication-and-roles.md`
- `../project-docs/phase-5-role-matrix.md`

## Edge Function

The protected invitation function is:

```txt
supabase/functions/invite-user/index.ts
```

It verifies the caller, checks the caller's active application role, creates the Auth invitation using the server-side service role, creates the linked invited profile, and records the action.

Deploy:

```bash
npx supabase link --project-ref <project-ref>
npx supabase secrets set \
  AUTH_ALLOWED_ORIGINS='https://<approved-dashboard-origin>' \
  AUTH_INVITE_REDIRECT_URL='https://<approved-dashboard-origin>/<path>?authAction=accept-invite' \
  --project-ref <project-ref>
npx supabase functions deploy invite-user --project-ref <project-ref>
```

The service-role key never enters the browser bundle.

## Seed data

Local seed data is stored in:

```txt
supabase/seed.sql
```

It contains clearly labeled demo records and invalid example email domains. It is not live MLB data.

Resetting reapplies migrations and seed data:

```bash
npm run db:reset
```

## Environment separation

Use separate projects:

| Environment | Purpose |
|---|---|
| Local | Migrations, seed data, authentication tests, and automated validation |
| Development | Shared UAT and role testing |
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

Server/CLI-only values must not use the `VITE_` prefix:

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

Apply and validate in development before production.

## Initial owner

Follow `FIRST_OWNER.md` to create and link the first owner. Use the dashboard user-administration panel for all later invitations.

## Backup and restore

Backup:

```bash
DATABASE_URL='...' npm run db:backup
```

Restore only after confirming the target:

```bash
DATABASE_URL='...' \
BACKUP_FILE='backups/mlb-dashboard-YYYYMMDDTHHMMSSZ.dump' \
ALLOW_DATABASE_RESTORE=true \
npm run db:restore
```

Backup output is excluded from Git.

## CI validation

`.github/workflows/backend-ci.yml` performs:

1. Dependency installation.
2. Environment validation.
3. Production application build.
4. Local Supabase startup.
5. Migration and seed reset.
6. Database lint.
7. Local owner bootstrap.
8. Authentication smoke test.
9. Local Supabase shutdown.

Successful CI should be confirmed before applying Phase 5 to a shared development project.
