# Phase 5 Authentication, Users, and Roles

## Purpose

Phase 5 converts the Phase 4 database security foundation into a complete application access system.

The implementation provides:

- Invitation-only Supabase authentication.
- Sign in and sign out.
- Password recovery.
- Invitation acceptance through password creation.
- Authentication-account to application-profile linkage.
- User lifecycle states.
- Role-aware application controls.
- User administration.
- Browser authorization that matches database RLS.
- Protected user invitations through a Supabase Edge Function.

Local development remains available through an automatically provisioned local owner identity. Production Supabase mode requires a valid authenticated session and linked application profile before the dashboard mounts.

## Foundation Cleanup

The repository already contained partial Phase 5 files when implementation began. Several of those files referenced RPCs and database views that did not exist, duplicated authentication providers, or treated authorized managers as fully read-only.

Phase 5 cleanup completed the following:

1. Consolidated authentication under one `AuthProvider` and one `AuthenticationGate`.
2. Consolidated user administration under one panel and one service.
3. Removed superseded duplicate authentication and user-administration files.
4. Reconciled the browser capability matrix with database RLS.
5. Added field-category authorization for the remaining nested legacy records.
6. Added collection-scoped Supabase saves so a narrow role does not attempt unauthorized table writes.

## Authentication Modes

### Local mode

```txt
VITE_AUTH_MODE=local
```

Local mode:

- Does not require credentials.
- Creates a local owner profile in memory.
- Retains all prototype behavior.
- Is intended for local development and demonstrations only.

### Supabase mode

```txt
VITE_AUTH_MODE=supabase
VITE_DATA_PROVIDER=supabase
```

Supabase mode requires:

- Supabase project URL.
- Browser publishable key.
- Applied Phase 4 and Phase 5 migrations.
- An authentication account.
- A linked `user_profiles` record.
- An active application profile before operational data is available.

Public self-registration remains disabled.

## Database Migrations

Phase 5 adds:

```txt
supabase/migrations/20260715000400_phase5_authentication_and_roles.sql
supabase/migrations/20260715000500_phase5_profile_self_service.sql
supabase/migrations/20260715000600_phase5_profile_function_fix.sql
```

### User lifecycle fields

The `user_profiles` table now includes:

- `invited_at`
- `activated_at`
- `deactivated_at`
- `last_seen_at`
- `invited_by`
- `invitation_message`

### User lifecycle states

| Status | Meaning |
|---|---|
| `invited` | Authentication account and profile exist, but password activation is incomplete |
| `active` | User may receive the permissions assigned to their role |
| `inactive` | Authentication may exist, but application access is blocked |

Inactive profiles are retained instead of deleted so historical attribution and audit records remain valid.

## Authentication RPCs

### `get_my_access_context()`

Returns the authenticated user's:

- Profile ID.
- Authentication-user ID.
- Display name and email.
- Role and lifecycle status.
- Team-member relationship.
- Region access.
- Login and lifecycle timestamps.
- Server-calculated permission summary.

The function can return invited or inactive profiles without granting operational-table access.

### `activate_my_invitation()`

After an invited user sets a password, this function:

- Confirms the linked profile exists.
- Refuses activation of an inactive profile.
- Changes `invited` to `active`.
- Records activation and login timestamps.
- Writes an activity-log entry.

### `touch_my_session()`

Records login/last-seen activity for an active profile.

### `update_user_access()`

Allows authorized administrators to change:

- Role.
- Status.
- Region access.
- Team-member relationship.

Protections include:

- Only owners may assign or modify the owner role.
- The last active owner cannot be demoted or deactivated.
- All role/status changes are written to the activity log.

### `update_my_profile()`

Allows an active authenticated user to update their display name without gaining broader profile-update access.

## Invitation Edge Function

The invitation endpoint is:

```txt
supabase/functions/invite-user/index.ts
```

The function:

1. Requires a valid caller JWT.
2. Confirms the caller has an active profile.
3. Restricts invitations to owner/business-admin roles.
4. Allows only an owner to invite another owner.
5. Validates email, role, region, and team-member linkage.
6. Creates the Supabase Auth invitation.
7. Creates the linked invited application profile.
8. Rolls back the auth user if profile creation fails.
9. Writes an invitation activity record.

The Supabase service-role key remains inside the Edge Function environment and is never included in browser code.

## Application Entry Boundary

```txt
src/main.jsx
src/auth/AuthContext.jsx
src/components/auth/AuthenticationGate.jsx
```

The dashboard renders only after the gate resolves one of these states:

- Loading.
- Signed out.
- Password recovery.
- Invitation activation.
- Active access.
- Inactive profile.
- Unlinked authentication account.
- Configuration error.
- Authentication/profile resolution error.

## Password Flows

### Password recovery

The sign-in screen can request a password-reset email. The redirect includes:

```txt
authAction=reset-password
```

The returned session is required to choose the new password.

### Invitation acceptance

The invitation redirect includes:

```txt
authAction=accept-invite
```

The invited user must:

1. Open the invitation link.
2. Create a password meeting the configured minimum length.
3. Confirm the password.
4. Complete `activate_my_invitation()`.

The dashboard is not accessible until profile activation succeeds.

## User Administration

```txt
src/components/admin/UserAdminPanel.jsx
src/services/userAdminService.js
```

Authorized administrators can:

- Invite users.
- Assign roles.
- Link users to team members.
- Assign regional access.
- Activate or deactivate profiles.
- Request password-reset messages.
- Review invitation, activation, and last-seen timestamps.

User deletion is deliberately not part of Phase 5.

## Account Controls

```txt
src/components/auth/AccountControl.jsx
```

Authenticated users receive an account control that provides:

- Profile and role visibility.
- Display-name update.
- Password-recovery request.
- Sign out.
- User administration when authorized.
- Backend administration when authorized.

The control is visually minimized in Wallboard display mode.

## Browser Authorization

```txt
src/auth/permissions.js
src/auth/runtimeAuthorization.js
src/services/projectStorage.js
```

Because the active dashboard still uses nested project records, Phase 5 compares the previous and proposed record before saving.

Changes are classified as:

- Sales/customer fields.
- Production/work-scope fields.
- Financial/cancellation/change-order fields.
- Project creation or removal.

Unauthorized changes are not written to local storage. The legacy dashboard remounts from the persisted cache and displays an authorization notice.

This prevents a read-only or narrow role from seeing an apparently successful local edit that the database later rejects.

## Role-Scoped Shared Synchronization

```txt
src/services/sharedProjectStorage.js
src/services/repositories/supabaseProductionRepository.js
```

Supabase saves can now specify authorized collections.

Examples:

- Sales management: customers, leads, sales team references, and jobs.
- Production management: jobs, work scopes, crews, and production team references.
- Financial management: jobs and change orders.
- Broad administrators: all operational collections.

This prevents a narrow role from attempting an upsert against every production table.

Phase 5 still does not implement record-by-record optimistic conflict resolution. That remains a later production-hardening item.

## Wallboard Role

The Wallboard role:

- Has no operator-dashboard access.
- Is read-only.
- Is automatically directed to:

```txt
?area=wallboard&display=1
```

- Retains a deliberately unobtrusive sign-out control.

## Environment Configuration

Browser variables:

```txt
VITE_DATA_PROVIDER=supabase
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_AUTH_REDIRECT_URL=https://<dashboard-host>/<path>
VITE_AUTH_INVITE_FUNCTION=invite-user
VITE_AUTH_PASSWORD_MIN_LENGTH=12
```

Edge Function secrets/settings:

```txt
AUTH_ALLOWED_ORIGINS=https://<dashboard-host>
AUTH_INVITE_REDIRECT_URL=https://<dashboard-host>/<path>?authAction=accept-invite
```

Supabase-provided function secrets include the project URL, anon key, and service-role key. The service-role key must never use a `VITE_` prefix.

## Deployment Sequence

1. Apply all Phase 4 and Phase 5 migrations to the development project.
2. Deploy the `invite-user` Edge Function.
3. Configure authentication site URL and allowed redirect URLs.
4. Configure Edge Function allowed origins and invitation redirect.
5. Create the first auth user and run the first-owner bootstrap.
6. Configure GitHub deployment variables and secrets.
7. Test owner login.
8. Invite and activate one account for every role.
9. Validate browser permissions and RLS for each role.
10. Validate password recovery and inactive-account blocking.
11. Run representative shared-data edits for sales, production, and broad administrator roles.
12. Promote the same reviewed migrations and function to production.

## Phase 5 Gate

Phase 5 code is complete when:

- Supabase authentication gates the application.
- Invitation acceptance activates the linked profile.
- Password recovery is available.
- User lifecycle and role administration exist.
- The last active owner is protected.
- Browser permissions align with RLS.
- Narrow roles cannot persist unauthorized nested-record changes.
- Shared saves are collection-scoped by role.
- Wallboard accounts are restricted to display access.
- Local mode remains usable for development.

Operational completion still requires successful CI, a configured Supabase development project, deployed Edge Function, and role-by-role UAT.
