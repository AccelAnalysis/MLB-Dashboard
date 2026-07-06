# MLB Dashboard Modular Refactor Plan

## Purpose

The current MLB Dashboard prototype has reached the point where the main dashboard file is carrying too many responsibilities at once. This refactor is intended to make future updates safer, easier to review, and less likely to accidentally introduce cluttered UI changes or regressions.

This is a documentation-only plan. It does **not** authorize feature changes, layout changes, visual redesigns, new views, or behavioral changes unless those changes are explicitly requested later.

## Current Situation

The active app entry point imports the field-complete dashboard directly from:

```txt
src/MLBDashboard_field_complete.jsx
```

The file currently combines several different concerns:

- Demo project data
- Date, period, and currency helpers
- Project status and alert calculations
- Sales and production metrics
- View routing logic
- Header and navigation rendering
- Production views
- Bottleneck views
- Sales views
- TV Wallboard view
- Project file modal
- Scope editor modal
- Critical Path Book CSV export logic
- Print-specific styling
- Help system wiring

Some modularization already exists:

- `src/services/projectStorage.js` handles local storage, backup import/export normalization, and reset behavior.
- `src/help/` already contains separate help system pieces.

The refactor should build on those existing separations rather than starting over.

## Refactor Goals

1. Preserve the current visible dashboard behavior.
2. Preserve the current navigation model.
3. Preserve the current operator/admin view as the primary dashboard.
4. Preserve the TV Wallboard view without adding extra duplicate dashboard views.
5. Reduce the size and responsibility of `MLBDashboard_field_complete.jsx`.
6. Separate business logic from presentation components.
7. Make future changes easier to isolate, test, and review.
8. Avoid creating a large risky rewrite.

## Non-Goals

This refactor should **not** do any of the following:

- Redesign the dashboard.
- Add new product features.
- Change the data model unless required only for extraction.
- Change labels, colors, spacing, layout, or navigation behavior.
- Replace localStorage with a backend.
- Connect JobNimbus, QuickBooks, Firebase, Supabase, or any other persistence layer.
- Remove existing prototype data.
- Change the help system behavior.
- Change the current whiteboard, critical path, sales, bottleneck, or wallboard behavior.

## Proposed Target Structure

```txt
src/
  app/
    MLBDashboard.jsx
    navigationConfig.js

  data/
    initialProjects.js
    constants.js

  services/
    projectStorage.js
    projectImportExport.js

  utils/
    dateUtils.js
    moneyUtils.js
    periodUtils.js
    projectMetrics.js
    projectStatus.js
    csvExport.js

  components/
    layout/
      Header.jsx
      AdminMenu.jsx
      MainNavigation.jsx
      SubNavigation.jsx
      MetricCard.jsx
      Badge.jsx

    production/
      ProjectCenterView.jsx
      MeasurementQueueView.jsx
      CriticalPathMeetingView.jsx
      CriticalPathBookView.jsx
      ProjectModal.jsx
      ScopeEditor.jsx
      PrintView.jsx

    bottlenecks/
      BottlenecksView.jsx

    sales/
      SalesView.jsx
      SalespersonCard.jsx

    wallboard/
      TVWallboardView.jsx
      WallboardProductionSnapshot.jsx
      WallboardBottlenecks.jsx
      WallboardSalesSnapshot.jsx
      WallboardCriticalPathSpotlight.jsx
```

This is a target structure, not a requirement to complete in one pass. Codex should move incrementally and stop after each phase if the build fails or behavior changes.

## Recommended Refactor Sequence

### Phase 1 — Extract Pure Helpers

Move pure helper functions out of the main dashboard file into utility files.

Recommended files:

```txt
src/utils/dateUtils.js
src/utils/moneyUtils.js
src/utils/periodUtils.js
```

Examples of logic to move:

- `toISODate`
- `todayISO`
- `daysAgo`
- `daysFromNow`
- `daysBetween`
- `formatDate`
- `currency`
- `getPeriodLabel`

Acceptance criteria:

- App builds successfully.
- Existing formatting output remains unchanged.
- No UI or behavior changes.

### Phase 2 — Extract Demo Data and Constants

Move static data and configuration out of the main dashboard file.

Recommended files:

```txt
src/data/initialProjects.js
src/data/constants.js
src/app/navigationConfig.js
```

Examples of items to move:

- `initialProjects`
- product categories
- regions
- periods
- view constants
- main navigation items
- production navigation items
- bottleneck navigation items
- color/status key constants

Acceptance criteria:

- App builds successfully.
- Demo data still loads when local storage is empty or reset.
- Header filters and navigation remain unchanged.

### Phase 3 — Extract Project Logic and Metrics

Move calculations and project-state helpers into utility modules.

Recommended files:

```txt
src/utils/projectStatus.js
src/utils/projectMetrics.js
```

Examples of logic to move:

- Revised amount calculations
- Scope status calculations
- Project alert calculations
- Scope alert calculations
- Pipeline metrics
- Sales totals
- Wallboard totals
- Critical path spotlight derivations
- Period filtering logic

Acceptance criteria:

- App builds successfully.
- Dashboard metrics remain the same for the same demo data.
- Bottleneck counts and alert badges remain the same.
- Sales and wallboard metrics remain the same.

### Phase 4 — Extract Reusable Layout Components

Move small reusable display components out of the main dashboard file.

Recommended files:

```txt
src/components/layout/MetricCard.jsx
src/components/layout/Badge.jsx
src/components/layout/Header.jsx
src/components/layout/AdminMenu.jsx
src/components/layout/MainNavigation.jsx
src/components/layout/SubNavigation.jsx
```

Important guardrail:

Do not redesign the header or admin menu. Extract existing markup and behavior only.

Acceptance criteria:

- Header looks and behaves the same.
- Admin menu still contains backup/export/import/reset and help actions.
- Help icons still appear where expected.
- New Project button still opens the project file modal.

### Phase 5 — Extract Major Views

Move each major view into its own component file.

Recommended files:

```txt
src/components/production/ProjectCenterView.jsx
src/components/production/MeasurementQueueView.jsx
src/components/production/CriticalPathMeetingView.jsx
src/components/production/CriticalPathBookView.jsx
src/components/bottlenecks/BottlenecksView.jsx
src/components/sales/SalesView.jsx
src/components/wallboard/TVWallboardView.jsx
```

Important guardrail:

The refactor should not create new top-level views. The current operator/admin dashboard should remain the main view. The TV Wallboard should remain a selectable view, not an added duplicate dashboard above the existing dashboard.

Acceptance criteria:

- Production Customer view works the same.
- Measurement Queue works the same.
- Critical Path Meeting view works the same.
- Critical Path Book view works the same.
- Bottlenecks filters work the same.
- Sales view works the same.
- TV Wallboard works the same.

### Phase 6 — Extract Project Modal and Scope Editor

Move the modal and scope editor into dedicated components.

Recommended files:

```txt
src/components/production/ProjectModal.jsx
src/components/production/ScopeEditor.jsx
src/components/production/PrintView.jsx
```

Important guardrail:

This is one of the highest-risk parts of the refactor because the modal holds a lot of form state and editing behavior. Keep props explicit and avoid changing the shape of `project`, `scope`, or `formData` unless absolutely necessary.

Acceptance criteria:

- Project file opens from all existing entry points.
- Customer-level file opens correctly.
- Scope-level file opens correctly.
- All modal tabs still work.
- Change orders can still be added.
- Financial revised totals still update.
- Cancellation fields still appear when cancelled is checked.
- Scope specs remain editable.
- Scope measure requested remains editable.
- Save still updates the dashboard.

### Phase 7 — Extract CSV and Print Support

Move CSV generation and print-oriented helpers out of the main component.

Recommended files:

```txt
src/utils/csvExport.js
src/services/projectImportExport.js
```

Acceptance criteria:

- Critical Path Book CSV export still downloads.
- Exported columns remain the same unless specifically requested later.
- Print view still works.
- Print CSS remains active.

### Phase 8 — Cleanup and Rename Main File

After all extractions are stable, replace the direct import of `MLBDashboard_field_complete.jsx` with a cleaner app component path.

Recommended final active file:

```txt
src/app/MLBDashboard.jsx
```

Then update:

```txt
src/main.jsx
```

From:

```js
import MLBDashboard from './MLBDashboard_field_complete.jsx';
```

To:

```js
import MLBDashboard from './app/MLBDashboard.jsx';
```

Important guardrail:

Do not delete `MLBDashboard_field_complete.jsx` until the refactored version is confirmed to build and behave correctly. It may be helpful to keep it temporarily as a comparison reference during the refactor.

Acceptance criteria:

- App builds successfully.
- App starts successfully.
- No visible behavior changes.
- No unused imports remain.
- The old large file is either removed only after validation or retained temporarily with a clear comment/documentation note.

## Validation Checklist

After each phase, Codex should run the available project checks. At minimum:

```bash
npm install
npm run build
```

If the repo has linting or tests available, also run:

```bash
npm run lint
npm test
```

Only use commands that exist in the project scripts.

Manual validation should include:

- Dashboard loads.
- Region filter works.
- Period filter works.
- Custom period fields work.
- Admin menu opens.
- Help Center opens.
- Help icons toggle on/off.
- Guided walkthrough still starts.
- New Project opens a modal.
- Existing project opens a modal.
- Scope card opens the appropriate scope file.
- Financial tab shows original contract, deposit, and revised total.
- Change orders can be added.
- Cancellation date/reason fields work.
- Critical Path Book export works.
- TV Wallboard opens without adding an extra dashboard above the current one.
- Fullscreen display mode still works.

## Risk Notes

### Highest-Risk Areas

1. Project modal state
2. Scope editor state
3. Alert and status calculations
4. Wallboard filtering and metrics
5. Help icon targeting through `data-help-id`
6. CSV export fields
7. Print CSS

### Refactor Strategy

Prefer extraction over rewriting. Codex should copy existing logic into new modules, import it, verify build success, then remove the duplicated old logic only after the imports are confirmed.

Avoid opportunistic cleanup that changes behavior. Any improvement that is not required for modularization should be left for a separate issue.

---

# Codex Prompt

Use the following prompt for Codex when ready to perform the refactor.

```txt
You are working in the AccelAnalysis/MLB-Dashboard repo.

Task: Refactor the MLB Dashboard from one large dashboard file into a modular React structure without changing visible behavior.

Important context:
- The active app currently imports the dashboard from src/MLBDashboard_field_complete.jsx.
- This dashboard is a prototype/operator view for Major League Builders.
- The dashboard is meant to replace the physical whiteboard and paper Critical Path Book while also supporting sales metrics, bottlenecks, project files, scope tracking, change orders, and the TV Wallboard.
- Previous changes accidentally added an undesired extra view above the current dashboard. Do not repeat that mistake.

Primary goal:
Make the codebase more maintainable by extracting helpers, data, constants, metrics, views, and modals into separate files while preserving the current UI, current navigation, current behavior, and current data shape.

Hard requirements:
1. Do not redesign the dashboard.
2. Do not add new views.
3. Do not remove existing views.
4. Do not change labels, colors, spacing, layout, or navigation unless required only to preserve existing behavior after extraction.
5. Do not connect external services.
6. Do not replace localStorage.
7. Do not change the project data model unless strictly necessary to preserve existing behavior.
8. Do not change help IDs or remove data-help-id attributes.
9. Do not change the current TV Wallboard behavior.
10. Keep the operator/admin view as the primary dashboard.
11. Keep changes incremental and easy to review.

Recommended phased approach:

Phase 1: Extract pure helpers.
Create utility files such as:
- src/utils/dateUtils.js
- src/utils/moneyUtils.js
- src/utils/periodUtils.js

Move existing pure helper functions such as date formatting, daysBetween, todayISO, daysAgo, daysFromNow, currency formatting, and period label logic.

Phase 2: Extract static data and constants.
Create files such as:
- src/data/initialProjects.js
- src/data/constants.js
- src/app/navigationConfig.js

Move demo project data, product categories, regions, periods, view constants, mode constants, and navigation item arrays.

Phase 3: Extract project business logic and metrics.
Create files such as:
- src/utils/projectStatus.js
- src/utils/projectMetrics.js

Move revised amount calculations, scope status calculations, project/scope alert calculations, filtered metrics, sales totals, wallboard totals, and critical path spotlight derivations.

Phase 4: Extract reusable layout components.
Create files such as:
- src/components/layout/MetricCard.jsx
- src/components/layout/Badge.jsx
- src/components/layout/Header.jsx
- src/components/layout/AdminMenu.jsx
- src/components/layout/MainNavigation.jsx
- src/components/layout/SubNavigation.jsx

Extract existing markup and behavior only. Do not redesign.

Phase 5: Extract major view components.
Create files such as:
- src/components/production/ProjectCenterView.jsx
- src/components/production/MeasurementQueueView.jsx
- src/components/production/CriticalPathMeetingView.jsx
- src/components/production/CriticalPathBookView.jsx
- src/components/bottlenecks/BottlenecksView.jsx
- src/components/sales/SalesView.jsx
- src/components/wallboard/TVWallboardView.jsx

Pass required data and handlers as props. Keep current behavior identical.

Phase 6: Extract project modal and scope editor.
Create files such as:
- src/components/production/ProjectModal.jsx
- src/components/production/ScopeEditor.jsx
- src/components/production/PrintView.jsx

Be careful with form state, scope editing state, change orders, cancellation fields, print behavior, and save behavior.

Phase 7: Extract CSV and print support.
Create files such as:
- src/utils/csvExport.js
- src/services/projectImportExport.js if useful

Preserve existing export columns and print behavior.

Phase 8: Rename/finalize the main app component.
Create:
- src/app/MLBDashboard.jsx

Update src/main.jsx to import:
import MLBDashboard from './app/MLBDashboard.jsx';

Only remove src/MLBDashboard_field_complete.jsx after the refactored version builds and behavior is confirmed. If uncertain, keep the old file temporarily as a reference and note that it is deprecated.

Validation:
- Run npm install if needed.
- Run npm run build.
- Run npm run lint and/or npm test only if those scripts exist.
- Fix any build errors caused by the refactor.

Manual behavior checklist:
- Dashboard loads.
- Region filter works.
- Period filter works.
- Custom period fields work.
- Admin menu opens.
- Export backup JSON works.
- Import backup JSON still triggers the file input.
- Reset demo data still works.
- Help Center opens.
- Help icons toggle on/off.
- Guided walkthrough still starts.
- New Project opens the project modal.
- Existing project opens the project modal.
- Customer cards expand/collapse.
- Scope cards open the correct scope file.
- Financial tab shows original contract, deposit, and revised total.
- Change orders can be added.
- Cancellation fields still appear when cancelled is checked.
- Scope specs remain editable.
- Scope measure requested remains editable.
- Critical Path Book view still works.
- Critical Path Book CSV export still works.
- Sales view still works.
- Bottlenecks view still works.
- TV Wallboard opens without adding an extra duplicate dashboard view.
- Fullscreen wallboard display mode still works.

Commit expectations:
- Make a documentation-aware, reviewable refactor commit or a small series of commits.
- Do not mix new feature work into this refactor.
- In the final response, summarize what was extracted, list files changed, confirm build status, and note any behavior that could not be manually validated.
```
