# Production Domain Layer

The `src/domain/` directory defines the Phase 3 production data model independently from the current nested prototype records.

## Responsibilities

- Stable production model versioning.
- Entity factory functions and normalization.
- Record identifiers.
- Enumerated statuses and roles.
- Executable entity/relationship definitions.
- Cross-record validation.
- Source-of-truth and overwrite rules.
- Production financial calculations.
- Legacy prototype migration.
- Production dataset packaging.

## Files

- `modelVersion.js` — model name and semantic version.
- `enums.js` — record, user, lead, payment, production, sync, and change-order states.
- `recordIds.js` — client-safe prefixed IDs.
- `entityDefinitions.js` — required fields and relationship metadata.
- `entityFactories.js` — normalized entity constructors.
- `validation.js` — entity, duplicate-ID, and cross-record validation.
- `sourceOfTruth.js` — field authority and overwrite rules.
- `productionCalculations.js` — approved change-order and financial calculations.
- `productionDataset.js` — normalized dataset container.
- `legacyProjectAdapter.js` — current prototype storage normalization.
- `legacyToProduction.js` — migration from nested prototype records to normalized production entities.
- `index.js` — public domain exports.

## Architectural Boundary

The active UI still uses `src/MLBDashboard_field_complete.jsx` and nested project records. The domain layer is the target contract for the shared backend, authentication, imports, audit history, and later integrations.

Do not make the active UI consume the normalized dataset until the data-service and migration rollout plan is approved and validated. The legacy adapter exists specifically to keep prototype persistence stable during that transition.

A machine-readable schema is available at:

```txt
schemas/production-dataset.schema.json
```
