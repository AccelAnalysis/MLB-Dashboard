# Phase 5 Authentication, Users, and Roles

## Purpose

Phase 5 adds production-oriented authentication and access control to the MLB Dashboard while preserving the stabilized dashboard and the Phase 4 local-development fallback.

The implementation uses Supabase Auth for account credentials and sessions, and the `public.user_profiles` table for MLB-specific identity, role, team-member linkage, lifecycle status, and regional access.

## Authentication model

Production/shared mode is invite-only:

- Public registration remains disabled.
- A Supabase Auth account is not sufficient by itself.
- Every authenticated account must be linked to an approved MLB Dashboard profile.
- The profile must be active before business data is mounted.
- Inactive or unlinked accounts are denied dashboard access.
- Passwords remain in Supabase Auth and are never stored in the dashboard tables.

Local mode continues to use a development-owner identity so the prototype can be opened without remote credentials.

## Application access gate

The production entry point now loads in this order:

1. Initialize the authentication provider.
2. Read or restore the Supabase session.
3. Resolve the linked MLB Dashboard profile through `get_current_user_context()`.
4. Activate an invited profile through `record_app_login()` when appropriate.
5. Confirm profile status and capabilities.
6. Mount the dashboard only after access is approved.
7. Start shared-data hydration and realtime subscriptions.

The dashboard is never mounted behind the login screen while authentication is unresolved.

## Account lifecycle

Supported profile states:

| State | Meaning |
|---|---|
| `invited` | Authentication invitation exists, but initial dashboard activation is incomplete. |
| `active` | Account may access the dashboard according to its role and regions. |
| `inactive` | Access is denied. A deactivation reason is required. |

The database records:

- Invitation date and inviting profile.
- Optional invitation message.
- Acceptance date.
- Last login.
- Last recorded password update.
- Deactivation reason.

## Login and password recovery

The React authentication UI supports:

- Email/password sign-in.
- Forgot-password email request.
- Password-recovery callback handling.
- New-password selection.
- Persistent session refresh.
- Sign-out.
- Profile display-name update.

Password reset and invitation links return to the configured dashboard URL.

## User administration

Owners and business administrators can open **Users, roles, and access** from the authenticated account control.

The administration panel supports:

- Inviting a user.
- Assigning a role.
- Linking the login profile to a historical or active team member.
- Assigning Virginia and/or Carolina access.
- Activating or deactivating a profile.
- Recording the reason for deactivation.
- Sending a password-recovery email.
- Reviewing invitation, acceptance, and login timestamps.

Only an owner can:

- Invite another owner.
- Assign the owner role.
- Modify an existing owner profile.
- Relink an owner's authentication identity.

The final active owner cannot be demoted, deactivated, or deleted.

## Secure invitation service

Invitations are created through:

```txt
supabase/functions/invite-user/index.ts
```

The Edge Function:

1. Verifies the caller's Supabase JWT.
2. Resolves the caller's active MLB Dashboard profile.
3. Confirms owner or business-admin authority.
4. Validates email, role, team-member reference, and region access.
5. Uses the service role only inside the Edge Function.
6. Invites the Supabase Auth user.
7. Creates the linked application profile.
8. Rolls back the authentication user if profile creation fails.
9. Writes an invitation activity record.

The service-role key is never exposed to the browser.

## Row Level Security refinements

Phase 5 adds or tightens RLS for:

- Current-user profile visibility.
- User-administrator profile visibility.
- Region-aware jobs.
- Region-aware work scopes and change orders.
- Salesperson ownership scope.
- Related customer and lead visibility.
- User management.
- Owner protection.

Individual salespeople see records assigned to their linked team-member identity rather than every job in an approved region.

## Legacy dashboard write compatibility

The active dashboard still operates on one nested legacy project dataset. Saving from that component rewrites the complete dataset rather than one permitted entity or field.

For that reason, Phase 5 permits full legacy write-back only for:

- Owner.
- Business Admin.
- Operations Admin.

Other roles receive authenticated, RLS-filtered read access in the legacy dashboard until granular role-specific editors are implemented:

- Sales Manager.
- Salesperson.
- Production Manager.
- Viewer.
- Wallboard.
- Developer Support.

This prevents a specialized role from unintentionally replacing records outside its permitted scope.

## Wallboard accounts

The `wallboard` role:

- Is read-only.
- Is forced into the Wallboard view and full-screen display mode.
- Does not expose normal account-management controls.
- Retains a discreet sign-out control.

## Local development workflow

After pulling Phase 5:

```bash
npm ci
npm run build
npm run supabase:start
npm run db:reset
npm run db:lint
```

Create or refresh a local owner account without copying the service-role key:

```bash
LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='use-a-local-password-of-12-or-more-characters' \
LOCAL_OWNER_NAME='Local MLB Owner' \
npm run auth:bootstrap-local
```

The bootstrap utility reads the local service-role value directly from `supabase status -o env` and does not write it to disk.

Create `.env.local` using values shown by the local Supabase status command:

```txt
VITE_DATA_PROVIDER=supabase
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable/anon key>
VITE_AUTH_REDIRECT_URL=http://127.0.0.1:5173
```

Never place the service-role key in `.env.local` or any `VITE_` variable.

Then run:

```bash
npm run dev
```

## Remote activation

For a shared Supabase environment:

1. Apply all reviewed migrations.
2. Deploy the `invite-user` Edge Function.
3. Configure approved origins and invitation redirect secrets.
4. Create the first authentication account.
5. Run the service-role-only `bootstrap_first_owner()` function.
6. Configure GitHub deployment variables and browser-safe secrets.
7. Test each role and region before production use.

Example Edge Function deployment:

```bash
npx supabase link --project-ref <development-project-ref>
npx supabase secrets set \
  AUTH_ALLOWED_ORIGINS='https://approved-dashboard.example' \
  AUTH_INVITE_REDIRECT_URL='https://approved-dashboard.example'
npx supabase functions deploy invite-user
```

## Files added or changed

### Database

```txt
supabase/migrations/20260715000400_phase5_authentication_roles.sql
supabase/migrations/20260715000500_phase5_user_lifecycle_guards.sql
supabase/migrations/20260715000600_phase5_invitation_metadata.sql
supabase/migrations/20260715000700_phase5_privilege_trigger_fix.sql
supabase/migrations/20260715000800_phase5_salesperson_record_scope.sql
```

### Authentication and permissions

```txt
src/config/authConfig.js
src/auth/permissions.js
src/auth/AuthContext.jsx
src/services/authService.js
src/components/auth/AuthGate.jsx
src/components/auth/AccountControl.jsx
```

### User administration

```txt
src/services/userAdministrationService.js
src/components/admin/UserAdministrationPanel.jsx
supabase/functions/invite-user/index.ts
```

### Compatibility and deployment

```txt
src/app/MLBDashboard.jsx
src/services/projectStorage.js
src/services/sharedProjectStorage.js
scripts/bootstrap-local-owner.mjs
scripts/verify-backend-config.mjs
.env.example
.github/workflows/deploy.yml
supabase/config.toml
```

## Known limitations

1. The large legacy dashboard is not yet decomposed into field-level permission-aware editors.
2. Specialized manager roles are read-only in the legacy interface even though the database defines narrower domain permissions.
3. User deletion is intentionally not exposed; deactivation is the normal lifecycle action.
4. Production email delivery depends on Supabase email configuration.
5. MFA and enterprise SSO are not included in this phase.
6. Remote credentials and projects are not committed to the repository.
7. Role and RLS acceptance testing must be completed before production activation.

## Phase 5 completion gate

Phase 5 implementation is complete when:

- Login and sign-out are implemented.
- Password recovery is implemented.
- A linked active profile is required.
- Invitations are server-side and invite-only.
- Roles and capabilities are explicit.
- RLS aligns with role and region access.
- Owner protections are database-enforced.
- User administration is available to authorized roles.
- Full legacy writes are restricted to compatible administrative roles.
- Local owner bootstrap and operational documentation exist.
- The application build, migrations, database reset, and lint checks pass.
