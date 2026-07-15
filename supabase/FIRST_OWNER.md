# Bootstrap the First Owner

The production database denies anonymous access and requires an active application profile for authenticated access. The first owner must therefore be linked through a privileged database operation.

## 1. Create the authentication account

In the target Supabase project:

1. Open **Authentication**.
2. Create or invite the MLB owner account.
3. Copy the auth user's UUID.

## 2. Run the bootstrap function

From the Supabase SQL editor, run:

```sql
select *
from public.bootstrap_first_owner(
  'USR-OWNER-001',
  '<AUTH-USER-UUID>'::uuid,
  'Owner Display Name',
  'owner@example.com'
);
```

Replace the UUID, display name, and email before executing.

The function:

- Verifies the auth user exists.
- Creates or updates the application profile.
- Assigns the `owner` role.
- Activates the profile.
- Grants Virginia and Carolina region access.
- Refuses to create a different active owner after one already exists.

## Security

`bootstrap_first_owner` is executable only by the Supabase `service_role` and privileged SQL execution. It is not granted to anonymous or normal authenticated browser users.

Do not place the service-role key in a `VITE_` environment variable or in the repository.

After the first owner is active, Phase 5 user administration should be used for all additional user invitations, role assignments, activation, and deactivation.
