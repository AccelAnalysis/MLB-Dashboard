# Services Layer

The services layer should contain persistence, imports/exports, integrations, and other side-effectful code. Phase 2 keeps the existing local-storage service in place and does not add backend dependencies.

Current service modules:

- `projectStorage.js` — local prototype persistence, backup export/import normalization, and reset behavior.

Future production service modules should be added incrementally:

- `authService.js`
- `permissionService.js`
- `auditLogService.js`
- `projectRepository.js`
- `importStagingService.js`
- `jobNimbusAdapter.js`
- `reportingService.js`

Do not connect external systems until the production data model and source-of-truth matrix are approved.
