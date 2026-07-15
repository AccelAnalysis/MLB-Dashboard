# Supabase Authentication Operations

## Overview

The MLB Dashboard uses invitation-only Supabase Auth with application roles stored in `public.user_profiles`.

An authentication account alone does not grant dashboard access. The account must also have a linked application profile. Operational data requires `status = 'active'`.

## Security rules

Never commit or expose:

- Supabase service-role key.
- Database password or connection string.
- JWT signing secret.
- Supabase access token.

The browser receives only the project URL and publishable/anon key. RLS and application-profile status protect production data.

## Migration order

Apply all repository migrations, including:

```txt
20260715000300_bootstrap_first_owner.sql
20260715000400_phase5_authentication_and_roles.sql
20260715000500_phase5_profile_self_service.sql
20260715000600_phase5_profile_function_fix.sql
```

## Local authentication test

### Start and reset Supabase

```bash
npm run supabase:start
npm run db:reset
npm run db:lint
```

### Bootstrap the local owner

```bash
LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='local-test-password-at-least-12-characters' \
LOCAL_OWNER_NAME='Local MLB Owner' \
npm run auth:bootstrap-local
```

The bootstrap script reads the local service-role key from the running Supabase CLI, creates or updates the Auth user, and calls the protected first-owner function. It does not write the service-role key to disk.

### Configure `.env.local`

Use `npx supabase status -o env` to obtain the local API URL and publishable/anon key.

```txt
VITE_DATA_PROVIDER=supabase
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable/anon key>
VITE_AUTH_REDIRECT_URL=http://127.0.0.1:5173
VITE_AUTH_INVITE_FUNCTION=invite-user
VITE_AUTH_PASSWORD_MIN_LENGTH=12
```

Do not copy the service-role key into `.env.local`.

### Run the dashboard

```bash
npm run dev
```

Sign in with the local owner credentials.

## Auth URL configuration

In the Supabase project authentication URL settings:

1. Set the Site URL to the deployed dashboard base URL.
2. Add exact invitation and recovery redirect URLs.
3. Include the GitHub Pages repository path when applicable.
4. Add local URLs only to development projects.
5. Keep public sign-up disabled.

Recommended local redirects:

```txt
http://127.0.0.1:5173
http://localhost:5173
```

Avoid overly broad wildcard redirects.

## Deploy the invitation function

```bash
npx supabase functions deploy invite-user --project-ref <project-ref>
```

Configure the allowed browser origin and invitation destination:

```bash
npx supabase secrets set \
  AUTH_ALLOWED_ORIGINS='https://<dashboard-origin>' \
  AUTH_INVITE_REDIRECT_URL='https://<dashboard-origin>/<path>?authAction=accept-invite' \
  --project-ref <project-ref>
```

Supabase provides the project URL, anon key, and service-role key to the function environment. The service-role key must never be copied into frontend variables.

## Create the first owner

Follow `supabase/FIRST_OWNER.md`.

The first owner requires:

1. A Supabase Auth user.
2. The Auth user UUID.
3. A privileged call to `public.bootstrap_first_owner(...)`.

After the first owner signs in, additional accounts should be invited through the dashboard user-administration panel.

## Invite a user

As an owner or business administrator:

1. Open the authenticated account control.
2. Choose **Users, Roles, and Access**.
3. Choose **Invite User**.
4. Enter display name and email.
5. Assign role, regions, and optional team-member linkage.
6. Send the invitation.

The application profile remains `invited` until the person follows the link and creates a password.

## Invitation activation

The invitation returns to the dashboard with an authenticated invitation session and `authAction=accept-invite`.

The user creates and confirms a password. The application then calls:

```sql
public.activate_my_invitation()
```

Successful activation changes the profile to `active` and records the event.

## Password recovery

Recovery may be requested from the sign-in page, account control, or user-administration panel.

The recovery link returns with:

```txt
authAction=reset-password
```

The user chooses a new password, and the application rechecks the linked profile before opening the dashboard.

## User lifecycle

- `invited`: account exists but password activation is incomplete.
- `active`: role permissions may be used.
- `inactive`: dashboard access is blocked even when the Auth account still exists.

Deactivate rather than delete profiles that have historical sales, production, approval, import, or activity attribution.

## Role changes

Role and status changes use `public.update_user_access(...)`.

The function:

- Requires owner or business-administrator authority.
- Restricts owner-role changes to owners.
- Protects the last active owner.
- Updates region and team linkage.
- Records access changes in the activity log.

## GitHub deployment configuration

Repository variables:

```txt
VITE_DATA_PROVIDER=supabase
VITE_AUTH_MODE=supabase
VITE_AUTH_REDIRECT_URL=<production dashboard URL>
VITE_AUTH_INVITE_FUNCTION=invite-user
VITE_AUTH_PASSWORD_MIN_LENGTH=12
VITE_ENABLE_REALTIME=true
```

Repository/environment secrets:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

The publishable key is included in the browser build by design. The service-role key must never be included.

## Role test checklist

Create a test account for every role and verify:

1. Sign in and sign out.
2. Invitation acceptance.
3. Password recovery.
4. Inactive-profile blocking.
5. Unlinked-auth-account blocking.
6. Owner-role restrictions.
7. Last-owner protection.
8. User-management visibility.
9. Backend-administration visibility.
10. Sales-field authorization.
11. Production-field authorization.
12. Financial-field authorization.
13. Read-only rollback.
14. Wallboard-only routing.
15. Shared synchronization under each writing role.

Current limitations must be reflected in testing:

- Salesperson ownership-scoped editing is deferred while the app uses one nested legacy dataset.
- Database-level region row filtering is not yet activated.
- Full optimistic conflict resolution is not yet implemented.

## Production readiness

Before production activation:

- Confirm production SMTP/email delivery.
- Confirm all redirects use HTTPS and exact allowed paths.
- Restrict Edge Function allowed origins.
- Confirm service-role credentials are absent from browser bundles.
- Test every role against production-equivalent RLS.
- Retain an emergency second owner account.
- Back up existing production data before migrations.
