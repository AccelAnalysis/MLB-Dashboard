# Phase 5 Completion Status

## Repository state

Phase 5 is implemented on `main` and is mirrored by the checkpoint branch:

```txt
phase-5-authentication-and-roles
```

## Canonical implementation

### Application

```txt
src/main.jsx
src/auth/AuthContext.jsx
src/auth/permissions.js
src/auth/runtimeAuthorization.js
src/components/auth/AuthenticationGate.jsx
src/components/auth/AccountControl.jsx
src/components/admin/UserAdminPanel.jsx
src/services/authService.js
src/services/userAdminService.js
```

### Shared persistence enforcement

```txt
src/services/projectStorage.js
src/services/sharedProjectStorage.js
src/services/repositories/supabaseProductionRepository.js
```

### Supabase

```txt
supabase/functions/invite-user/index.ts
supabase/migrations/20260715000400_phase5_authentication_and_roles.sql
supabase/migrations/20260715000500_phase5_profile_self_service.sql
supabase/migrations/20260715000600_phase5_profile_function_fix.sql
supabase/migrations/20260715000700_phase5_user_profile_rpc_only.sql
supabase/migrations/20260715000800_phase5_password_activation_guard.sql
```

Earlier partial Phase 5 files and conflicting migrations were removed. The repository now has one authentication gate, one user-administration panel/service, and one deterministic Phase 5 migration chain.

## Completed capabilities

- Invitation-only sign in.
- Sign out.
- Password recovery.
- Invitation acceptance through password creation.
- Database verification that an invited account has a password before activation.
- Auth account to application-profile linkage.
- Invited, active, and inactive lifecycle states.
- Owner and business-administrator user management.
- Owner-only owner-role assignment.
- Last-active-owner protection.
- Role and status activity history.
- Team-member and region assignment.
- Self-service display-name updates.
- Browser permission matrix.
- Field-category authorization for nested legacy records.
- Unauthorized-change rollback and user notice.
- Role-scoped shared collection saves.
- RPC/service-role-only `user_profiles` writes.
- Wallboard-only routing.
- Local owner bootstrap.
- Local authentication smoke-test script.
- CI steps for build, migrations, lint, owner bootstrap, and authentication verification.

## Remaining verification

The GitHub connector does not expose a completed workflow status for the latest push. The following must complete successfully in GitHub Actions or a local Docker-capable environment:

```bash
npm ci
npm run backend:check
npm run build
npm run supabase:start
npm run db:reset
npm run db:lint

LOCAL_OWNER_EMAIL='phase5-owner@example.invalid' \
LOCAL_OWNER_PASSWORD='phase5-ci-password-2026-only' \
LOCAL_OWNER_NAME='Phase 5 CI Owner' \
npm run auth:bootstrap-local

LOCAL_OWNER_EMAIL='phase5-owner@example.invalid' \
LOCAL_OWNER_PASSWORD='phase5-ci-password-2026-only' \
npm run auth:verify-local

npm run supabase:stop
```

## Operational activation requirements

Code completion does not activate production authentication. Activation still requires:

1. Development and production Supabase projects.
2. Applied canonical migrations.
3. Deployed `invite-user` Edge Function.
4. Exact Auth site/redirect URLs.
5. Allowed Edge Function browser origins.
6. First owner bootstrap.
7. GitHub browser-safe variables and secrets.
8. Invitation and password-recovery email delivery.
9. One UAT account for each role.
10. Role-by-role browser and RLS tests.
11. Controlled shared-data bootstrap.

## Known limitations

- The current interface still writes nested legacy project records.
- Salesperson ownership-scoped editing is deferred until normalized screens are active.
- Region assignments are stored but database-level row filtering by region is not yet enabled.
- Full optimistic concurrency and merge conflict resolution remain deferred.
- User deletion is intentionally excluded; inactive profiles preserve attribution and audit history.

## Phase 5 gate

Phase 5 implementation is complete in the repository. Production activation remains gated by successful CI, development-environment deployment, email configuration, and role-by-role UAT.
