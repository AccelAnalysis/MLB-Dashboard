# Phase 2 Codebase Modernization Implementation

## Purpose

Phase 2 begins modernizing the MLB Dashboard codebase so future backend, authentication, roles, reports, imports, and JobNimbus integration work can be added safely.

The project is still running the stabilized prototype, but Phase 2 introduces the target module structure and reusable utilities needed to break down the large active dashboard file incrementally.

## Implementation Summary

Phase 2 is intentionally behavior-preserving. It does not redesign the dashboard, replace local storage, add backend dependencies, add authentication, or connect JobNimbus.

The app now enters through a clean app wrapper:

```txt
src/app/MLBDashboard.jsx
```

`src/main.jsx` imports this wrapper instead of importing the large dashboard file directly. The wrapper still renders the existing stabilized dashboard component from:

```txt
src/MLBDashboard_field_complete.jsx
```

This gives future phases a stable app entry point while avoiding visible UI or behavior changes.

## Files Added

### App layer

```txt
src/app/MLBDashboard.jsx
src/app/navigationConfig.js
```

Purpose:

- Establish a clean application entry point.
- Preserve the current dashboard behavior through a legacy wrapper.
- Give future refactor passes a place to move app-level navigation and orchestration.

### Utility layer

```txt
src/utils/dateUtils.js
src/utils/moneyUtils.js
src/utils/periodUtils.js
src/utils/projectStatus.js
src/utils/projectMetrics.js
src/utils/README.md
```

Purpose:

- Centralize date handling.
- Centralize money and percent formatting.
- Centralize period/date-range filtering.
- Centralize project status, alert, revised amount, and closeout logic.
- Centralize pipeline, sales, wallboard, and critical-path metric calculations.

These modules mirror the current prototype logic and are intended for incremental replacement of inline logic inside `src/MLBDashboard_field_complete.jsx`.

### Data layer

```txt
src/data/constants.js
src/data/README.md
```

Purpose:

- Centralize stable constants such as product categories, regions, board columns, modal tab IDs, wallboard columns, whiteboard status key, and UI storage key.

### Layout components

```txt
src/components/layout/Badge.jsx
src/components/layout/MetricCard.jsx
src/components/layout/WhiteboardStatusKey.jsx
src/components/layout/README.md
```

Purpose:

- Prepare reusable display components for future extraction from the large dashboard file.
- Preserve current visual behavior and class names.

### Types/model reference

```txt
src/types/projectModels.js
```

Purpose:

- Document the current JavaScript data contracts with JSDoc typedefs.
- Avoid a TypeScript migration during this stabilization cycle.
- Create a clearer production target for customer, project, scope, change order, sales activity, and user profile records.

### Services documentation

```txt
src/services/README.md
```

Purpose:

- Clarify the service-layer boundary.
- Preserve `projectStorage.js` as the current local prototype persistence service.
- Define future service candidates for auth, permissions, audit logs, imports, JobNimbus, and reporting.

## What Changed in Runtime

Only one runtime entry change was made:

```txt
src/main.jsx
```

Before Phase 2, it imported:

```js
import MLBDashboard from './MLBDashboard_field_complete.jsx';
```

After Phase 2, it imports:

```js
import MLBDashboard from './app/MLBDashboard.jsx';
```

The wrapper renders the same existing dashboard component, so visible behavior should remain unchanged.

## What Did Not Change

Phase 2 did not:

- Redesign the dashboard.
- Add new top-level views.
- Remove existing views.
- Change labels, colors, spacing, or navigation behavior.
- Replace local browser storage.
- Add authentication.
- Add role-based permissions.
- Add JobNimbus integration.
- Add QuickBooks integration.
- Change the current data model.
- Change dashboard calculations in active runtime.
- Change the TV Wallboard behavior.
- Change help IDs or `data-help-id` attributes.

## Known Issues After Phase 2

The codebase is now better prepared for refactoring, but these production blockers remain:

1. `src/MLBDashboard_field_complete.jsx` is still the active dashboard implementation behind the wrapper.
2. Utility modules have been added, but the large file still contains duplicate inline logic.
3. Layout components have been added, but the large file still contains inline versions.
4. Demo data still lives inside the large dashboard file.
5. There is still no shared backend.
6. There is still no authentication or role-based access control.
7. There is still no activity/audit log.
8. Reports remain distributed across the current dashboard views rather than a dedicated production reporting module.
9. JobNimbus integration remains optional and not implemented.
10. A local or CI build should be run after pulling the latest changes.

## Recommended Next Refactor Pass

The next implementation pass should replace duplicated inline logic in the large dashboard file with the new modules in this order:

1. Replace date helpers with `src/utils/dateUtils.js`.
2. Replace currency/percent helpers with `src/utils/moneyUtils.js`.
3. Replace period helpers with `src/utils/periodUtils.js`.
4. Replace constants with `src/data/constants.js` and `src/app/navigationConfig.js`.
5. Replace status and alert helpers with `src/utils/projectStatus.js`.
6. Replace metric derivations with `src/utils/projectMetrics.js`.
7. Replace inline `Badge`, `MetricCard`, and `WhiteboardStatusKey` with layout components.
8. Only then begin extracting large views and modals.

## Validation Checklist

After pulling this update, run:

```bash
npm install
npm run build
npm run dev
```

Then manually check:

- Dashboard loads without console errors.
- Main navigation works.
- Production > Customer still works.
- Production > Book still works.
- Production > Meeting still works.
- Bottlenecks > All still works.
- Bottlenecks > Measurement still works.
- Sales still works.
- TV Wallboard still works.
- Full-screen wallboard display mode still works.
- Admin menu still opens.
- Help Center still opens.
- Help icons still toggle on/off.
- New Project still opens the project modal.
- Existing projects still open correctly.
- Critical Path Book CSV export still downloads.

## Phase 2 Production Gate

Phase 2 is complete when the repository has a safe modular foundation, a clean app entry point, documented model boundaries, and reusable utilities/components ready for incremental extraction without changing the visible dashboard behavior.
