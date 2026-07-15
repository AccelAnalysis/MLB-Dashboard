# Services Layer

The services layer contains authentication, persistence, shared-backend access, imports/exports, integrations, administration, and other side-effectful code. It depends on the production domain model rather than redefining record shapes inside individual services.

## Active services

### Authentication and users

- `authService.js` — Supabase session initialization, login, logout, invite activation, password recovery, password update, profile resolution, and local-development identity.
- `userAdministrationService.js` — secured profile listing, invitation-function invocation, role/status/region/team updates, and recovery requests.
- `supabaseClient.js` — singleton browser Supabase client using publishable credentials only.

### Production data

- `projectStorage.js` — immediate legacy local-storage cache, JSON backup export/import, reset behavior, and Phase 5 write guard.
- `sharedProjectStorage.js` — guarded synchronization between nested legacy UI records and the normalized production repository, including authenticated legacy-write capability checks.
- `productionRepository.js` — selects the configured production repository provider.
- `backendErrors.js` — structured backend and authentication error types and normalization.
- `backendAdminService.js` — health, data-quality review, explicit bootstrap, and validated export.

## Repository implementations

- `repositories/localProductionRepository.js` — normalized local dataset provider and cross-tab subscription.
- `repositories/supabaseProductionRepository.js` — shared Postgres loading, ordered upserts, health checks, data-quality review, and realtime subscriptions.
- `repositories/supabaseMappers.js` — explicit camelCase domain to snake_case database conversion.

## Authentication boundary

In Supabase mode, the application must resolve both:

1. A valid Supabase Auth session.
2. A linked active `user_profiles` record.

The browser never receives the service-role key. Invitations requiring privileged Auth administration are handled by:

```txt
supabase/functions/invite-user/index.ts
```

Roles and regions are enforced in PostgreSQL RLS and repeated in the browser only for usability and feature visibility.

## Persistence boundaries

The current UI still consumes nested project records through `projectStorage.js`.

The shared bridge is:

```txt
legacy nested records
  -> normalized production dataset
  -> production repository
  -> Supabase/Postgres
```

Remote reads follow the reverse path through `src/domain/productionToLegacy.js`.

The prototype storage service continues to delegate legacy record normalization to:

```txt
src/domain/legacyProjectAdapter.js
```

Because the legacy dashboard saves the complete dataset, full write-back is permitted only when the authenticated profile has `legacyFullWrite`. Other roles may hydrate their RLS-authorized records into a read-only cache.

## Safety rules

- Local mode remains the default.
- Supabase data mode requires Supabase authentication mode.
- No service-role key is allowed in browser variables.
- No business data is mounted before active-profile verification.
- No remote writes occur before successful hydration.
- Empty shared databases are not bootstrapped automatically.
- All normalized datasets are validated before saving.
- Shared synchronization performs upserts only and does not delete absent records.
- Authentication and RLS are the security boundary for shared data.
- Owner protections are database-enforced.
- Inactive profiles require a reason.
- JobNimbus/import services must consult `src/domain/sourceOfTruth.js` before overwriting fields.
- Audit and status history must not be deleted when business records are archived.

## Future services

Add incrementally after the relevant production phases:

- `auditLogService.js`
- `importStagingService.js`
- `jobNimbusAdapter.js`
- `reportingService.js`
- `accountingAdapter.js`
- granular customer/job/scope mutation repositories for specialized roles

Do not connect external systems until source ownership, credentials, role enforcement, retry behavior, and audit requirements are approved.
