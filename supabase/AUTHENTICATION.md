# Supabase Authentication Operations

This guide covers Phase 5 authentication setup for local development, shared development, and production.

## Security rules

Never commit or paste publicly:

- Supabase service-role key.
- Database password.
- Database connection string.
- JWT signing secret.
- Access token.

The browser uses only:

- Supabase project URL.
- Publishable/anon key.

The service-role key is limited to server-side scripts, privileged SQL, CI secrets, and Supabase Edge Functions.

## Local authentication test

### 1. Start and reset Supabase

```bash
npm run supabase:start
npm run db:reset
npm run db:lint
```

Reset applies the Phase 5 migrations and demo seed data.

### 2. Create the local owner

Choose a local-only email and strong test password:

```bash
LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='local-test-password-at-least-12-characters' \
LOCAL_OWNER_NAME='Local MLB Owner' \
npm run auth:bootstrap-local
```

The script:

- Reads the local API URL and service-role key from the running Supabase CLI.
- Creates or updates the local authentication user.
- Confirms the local email.
- Calls the protected first-owner bootstrap RPC.
- Does not write the service-role key to disk.

Do not use the local test password in production.

### 3. Configure the browser

Run:

```bash
npx supabase status -o env
```

Copy only the local API URL and publishable/anon key into `.env.local`:

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

### 4. Start the dashboard

```bash
npm run dev
```

Sign in with the local owner email and password.

### 5. Test user administration

Open the account control in the lower-right corner and choose:

```txt
Users, roles, and access
```

Invite a test user with:

- A local test email.
- A non-owner role.
- At least one region where appropriate.
- A team-member link for a salesperson account.

### 6. Open the invitation email

Use the local email-testing URL displayed by:

```bash
npm run supabase:status
```

Supabase local development normally exposes Mailpit for invitation and password-recovery messages. Open the invitation email there and follow its link.

### 7. Test role behavior

At minimum validate:

- Owner can manage users.
- Business Admin can manage non-owner users.
- Business Admin cannot modify an owner.
- Operations Admin can edit the legacy dashboard but cannot manage users.
- Salesperson sees only assigned records.
- Viewer is read-only and region-filtered.
- Wallboard is forced into full-screen Wallboard mode.
- Inactive user is denied access.
- Final active owner cannot be deactivated or demoted.
- Password recovery returns to the dashboard and accepts a new password.

### 8. Stop the stack

```bash
npm run supabase:stop
```

A normal stop preserves the local database volume.

## Shared development setup

### Apply migrations

```bash
npx supabase login
npx supabase link --project-ref <development-project-ref>
npm run db:push
```

### Configure authentication URLs

In the Supabase project authentication settings, configure:

- Site URL: the shared development dashboard URL.
- Redirect URLs: the exact dashboard URLs allowed for invitations and password recovery.

Do not use wildcard redirects broader than necessary.

### Deploy the invitation function

```bash
npx supabase secrets set \
  AUTH_ALLOWED_ORIGINS='https://development-dashboard.example' \
  AUTH_INVITE_REDIRECT_URL='https://development-dashboard.example'

npx supabase functions deploy invite-user
```

Supabase automatically provides its URL, anon key, and service-role key to the deployed function environment.

### Bootstrap the first owner

1. Create or invite the first authentication user through Supabase Authentication.
2. Copy that user's UUID.
3. Run the documented `bootstrap_first_owner()` call from `supabase/FIRST_OWNER.md` using privileged SQL execution.
4. Sign in and create all later users through the application administration panel.

## Production setup

Production should use a separate Supabase project.

Before activation:

1. Complete development UAT.
2. Confirm all migrations apply cleanly.
3. Confirm RLS behavior for every role.
4. Confirm production SMTP/email delivery.
5. Confirm exact production redirect URLs.
6. Confirm first-owner recovery procedures.
7. Configure GitHub deployment variables and browser-safe secrets.
8. Back up existing production data before migrations.
9. Deploy the invitation Edge Function.
10. Enable `VITE_DATA_PROVIDER=supabase` and `VITE_AUTH_MODE=supabase` together.

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

Repository or environment secrets:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Despite being stored as a GitHub secret, the publishable key is intentionally included in the built browser application. RLS and authenticated profiles protect access; the service-role key must never be included.

## Troubleshooting

### Authentication user exists but access is denied

Verify a `user_profiles` record exists with:

- Matching `auth_user_id`.
- `status = 'active'` or a valid initial `invited` state.
- Valid role.
- Region access where required.

### Invitation succeeds but email does not arrive

- Local: inspect Mailpit through the URL shown by `supabase status`.
- Remote: verify SMTP configuration, email templates, rate limits, and redirect URLs.

### User sees no jobs

Check:

- Profile status.
- Region access.
- Team-member link.
- Salesperson assignment on the job.
- RLS policies and current role.

### User changed their own role or status

The current session may hold stale UI capability state until it refreshes. Sign out and sign back in after security-sensitive profile changes.

### Local stack exposes development credentials

That output is expected for local Supabase. Do not paste the full status output publicly. Stop the stack when it is not being used, especially on an untrusted network.
