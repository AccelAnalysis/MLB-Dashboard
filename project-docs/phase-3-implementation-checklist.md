# Phase 3 Implementation Checklist

## Completed

- [x] Isolated legacy project normalization from the storage service.
- [x] Defined production model name and version.
- [x] Defined normalized customer, lead, job, work-scope, change-order, user, team-member, crew, status-event, activity-log, and import-run entities.
- [x] Defined record metadata and lifecycle enums.
- [x] Defined prefixed record IDs.
- [x] Defined executable entity relationships.
- [x] Added entity factories and normalizers.
- [x] Added approved change-order and financial calculations.
- [x] Added field source-of-truth and overwrite rules.
- [x] Added entity-level and cross-record validation.
- [x] Added duplicate-ID detection.
- [x] Added legacy nested-record migration.
- [x] Added normalized production dataset packaging.
- [x] Added JSDoc production model references.
- [x] Added a machine-readable JSON Schema.
- [x] Added the data dictionary, relationship rules, and source-of-truth matrix.
- [x] Preserved the active prototype runtime and local-storage key.

## Required Local/CI Validation

- [ ] Run `npm install`.
- [ ] Run `npm run build`.
- [ ] Run `npm run dev`.
- [ ] Confirm existing local data loads.
- [ ] Confirm backup export/import works.
- [ ] Confirm customer/project editing works.
- [ ] Confirm Critical Path Book CSV export works.
- [ ] Confirm TV Wallboard works.
- [ ] Confirm there are no unresolved imports under `src/domain/`.

## Before Shared Backend Implementation

- [ ] Select backend/database provider.
- [ ] Decide whether monetary fields are stored as dollars or integer cents in the backend.
- [ ] Approve region/location configuration approach.
- [ ] Approve role and permission matrix.
- [ ] Confirm whether one lead can produce more than one job.
- [ ] Confirm whether one scope can have multiple simultaneous crews.
- [ ] Approve data-retention and deletion rules.
- [ ] Approve legacy-data migration and rollback plan.
- [ ] Validate JobNimbus fields against the source-of-truth matrix.
