# Utility Modules

Phase 2 begins extracting pure business logic from the large dashboard file into reusable utility modules.

Current modules:

- `dateUtils.js` — ISO dates, display formatting, and day-difference helpers.
- `moneyUtils.js` — currency and percent formatting helpers.
- `periodUtils.js` — dashboard period labels and date-range filtering.
- `projectStatus.js` — revised amount, closeout status, scope status, next actions, and alert derivation.
- `projectMetrics.js` — pipeline, sales, wallboard, and critical-path metric derivations.

These modules mirror current prototype behavior. Future refactor passes should replace inline logic in `src/MLBDashboard_field_complete.jsx` with imports from these modules one section at a time, validating the build after each pass.
