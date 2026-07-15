# Services Layer

The services layer contains persistence, shared-backend access, imports/exports, integrations, administration, and other side-effectful code. It depends on the production domain model rather than redefining record shapes inside individual services.

## Active services

- `projectStorage.js` — immediate legacy local-storage cache, JSON backup export/import, and reset behavior.
- `sharedProjectStorage.js` — guarded synchronization between nested legacy UI records and the normalized production repository.
- `productionRepository.js` — selects the configured production repository provider.
- `supabaseClient.js` — singleton browser Supabase client using publishable credentials only.
- `backendErrors.js` — structured backend error types and normalization.
- `backendAdminService.js` — health, data-quality review, explicit bootstrap, and validated export.

## Repository implementations

- `repositories/localProductionRepository.js` — normalized local dataset provider and cross-tab subscription.
- `repositories/supabaseProductionRepository.js` — shared Postgres loading, ordered upserts, health checks, data-quality review, and realtime subscriptions.
- `repositories/supabaseMappers.js` — explicit camelCase domain to snake_case database conversion.

## Persistence boundaries

The current UI still reads and writes nested project records through `projectStorage.js`.

The Phase 4 app wrapper performs this bridge:

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

## Safety rules

- Local mode remains the default.
- Shared mode requires explicit environment configuration.
- No service-role key is allowed in browser variables.
- No remote writes occur before successful hydration.
- Empty shared databases are not bootstrapped automatically.
- All normalized datasets are validated before saving.
- Phase 4 synchronization performs upserts only and does not delete absent records.
- Authentication and RLS are the security boundary for shared data.
- JobNimbus/import services must consult `src/domain/sourceOfTruth.js` before overwriting fields.
- Audit and status history must not be deleted when business records are archived.

## Future services

Add incrementally after the relevant production phases:

- `authService.js`
- `permissionService.js`
- `auditLogService.js`
- `importStagingService.js`
- `jobNimbusAdapter.js`
- `reportingService.js`
- `accountingAdapter.js`

Do not connect external systems until source ownership, credentials, role enforcement, retry behavior, and audit requirements are approved.
