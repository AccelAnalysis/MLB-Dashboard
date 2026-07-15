# Services Layer

The services layer contains persistence, imports/exports, integrations, and other side-effectful code. It should depend on the production domain model rather than redefining record shapes inside individual services.

## Current Service Modules

- `projectStorage.js` — local prototype persistence, JSON backup export/import, and reset behavior.

The prototype storage service now delegates legacy record normalization to:

```txt
src/domain/legacyProjectAdapter.js
```

This prevents storage code from becoming an undocumented data model and preserves a clean migration boundary.

## Production Domain Contract

Future services should consume the normalized exports under:

```txt
src/domain/
```

Important boundaries include:

- Entity factories and normalization.
- Dataset validation.
- Field source-of-truth rules.
- Legacy-to-production migration.
- Financial calculations.
- Entity relationship definitions.

## Future Production Services

Add these incrementally after the backend and authentication approach are approved:

- `authService.js`
- `permissionService.js`
- `auditLogService.js`
- `customerRepository.js`
- `jobRepository.js`
- `workScopeRepository.js`
- `importStagingService.js`
- `jobNimbusAdapter.js`
- `reportingService.js`

## Guardrails

- Do not let JobNimbus adapters write directly into UI state.
- Do not let import services overwrite dashboard-owned fields without consulting `src/domain/sourceOfTruth.js`.
- Do not duplicate entity normalization inside repositories.
- Do not delete audit/status history when business records are archived.
- Do not switch the active prototype to normalized storage without a tested migration and rollback plan.
