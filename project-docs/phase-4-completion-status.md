# Phase 4 Completion Status

## Repository state

Phase 4 is implemented on `main` and mirrored by the checkpoint branch:

```txt
phase-4-shared-backend
```

## Completed after the primary Phase 4 plan

The following items were completed after `phase-4-shared-backend.md` was first written:

1. A secure first-owner bootstrap migration was added:

   ```txt
   supabase/migrations/20260715000300_bootstrap_first_owner.sql
   ```

   It is service-role-only and does not weaken anonymous or authenticated RLS policies.

2. First-owner setup instructions were added:

   ```txt
   supabase/FIRST_OWNER.md
   ```

3. The automated npm lockfile refresh workflow completed successfully.

4. `package-lock.json` now contains:

   - `@supabase/supabase-js`
   - The Supabase CLI development dependency

5. The `phase-4-shared-backend` branch was moved to the current `main` commit and verified as identical.

## Remaining verification

The following requires GitHub Actions or a local environment with Docker:

```bash
npm ci
npm run build
npm run supabase:start
npm run db:reset
npm run db:lint
npm run supabase:stop
```

The repository contains `.github/workflows/backend-ci.yml` to run this validation. Its successful completion should be confirmed before promoting the shared backend to a remote development environment.

## Operational activation dependency

The shared backend remains disabled by default. Live activation still requires:

1. Development and production Supabase projects.
2. Applied migrations.
3. Supabase URL and publishable-key configuration.
4. Phase 5 authentication UI.
5. A linked active owner profile.
6. RLS testing by role.
7. Controlled data bootstrap or import.

Until those steps are completed, the dashboard continues operating safely through its existing local-storage path.
