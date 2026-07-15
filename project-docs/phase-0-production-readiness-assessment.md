# Phase 0 Production Readiness Assessment

## Purpose

This document implements Phase 0 of the MLB Dashboard production plan. Phase 0 is a documentation and assessment phase. It is intended to establish a safe production baseline before additional feature work, backend work, authentication, JobNimbus integration, or UI redesign occurs.

The immediate goal is to determine what exists today, what must be preserved, what is not production-ready, and what should be addressed before the dashboard becomes Major League Builders' operating platform.

## Phase 0 Outcome

Phase 0 should produce a clear production-readiness baseline for the repository.

At the end of this phase, the project team should know:

1. Which files and views are currently active.
2. Which features are working and should not be broken.
3. Which features are prototype-only.
4. Which gaps prevent production use.
5. Which risks must be controlled before Phase 1 and Phase 2 work.
6. Which implementation areas should be split into later development phases.

## Current Repository Baseline

Based on the existing project documentation, the active React/Vite dashboard currently imports the field-complete dashboard from:

```txt
src/MLBDashboard_field_complete.jsx
```

The existing refactor plan identifies this file as carrying many responsibilities at once, including demo data, helpers, metrics, navigation, production views, bottleneck views, sales views, TV Wallboard behavior, project modal behavior, scope editor behavior, Critical Path Book CSV export, print styling, and help system wiring.

Known supporting modules already include:

```txt
src/services/projectStorage.js
src/help/
```

These should be preserved and built upon instead of bypassed.

## Production Definition

For this project, "production-ready" means the dashboard can be used by MLB as a reliable internal operating system for sales and production management.

A production version should support:

- Shared multi-user access.
- Login and role-based permissions.
- Customer, job, and work-scope records.
- Manual Critical Path entry.
- Salesperson attribution.
- Sales scorecards.
- Production bottleneck tracking.
- Final amount and change order tracking.
- Cancellation tracking.
- Activity history.
- Import/export.
- TV wallboard display.
- Backup and recovery.
- Clear deployment process.

A production version should not depend on JobNimbus integration being complete. The dashboard should be manual-first and integration-ready.

## Phase 0 Non-Goals

Phase 0 should not directly introduce runtime behavior changes.

Do **not** use Phase 0 to:

- Redesign the dashboard.
- Add new top-level views.
- Remove existing dashboard views.
- Replace local storage with a backend.
- Add authentication.
- Add JobNimbus integration.
- Add QuickBooks integration.
- Change calculations.
- Change labels, colors, layout, spacing, or navigation behavior.
- Modify the TV Wallboard behavior.
- Alter existing help IDs or `data-help-id` attributes.

Those items belong to later implementation phases after the readiness assessment is complete.

## Current Feature Inventory Checklist

Use this checklist to document the current prototype before making production changes.

### Core Views

| Area | Current status | Production concern | Notes |
|---|---|---|---|
| Executive/operator dashboard | Present in prototype | Needs stable data source | Preserve as primary internal view |
| Production views | Present in prototype | Needs backend and role controls | Preserve behavior during refactor |
| Critical Path Book | Present in prototype | Needs manual entry workflow and persistence | Critical production workflow |
| Critical Path Meeting view | Present in prototype | Needs live data and meeting usability validation | Key Hannah/Jimmy workflow |
| Bottlenecks | Present in prototype | Needs validated formulas and thresholds | Important management view |
| Sales view | Present in prototype | Needs salesperson profiles and lead data | High-priority production area |
| Customer/work-scope view | Present in prototype | Needs better production data model | Must support multi-scope customers |
| TV Wallboard | Present in prototype | Needs read-only wallboard user and TV-safe validation | Do not add duplicate dashboard views |
| Help system | Present in prototype | Needs preservation during refactor | Preserve IDs and behavior |
| Admin menu | Present in prototype | Needs future production role controls | Preserve existing utilities |

### Existing Functional Areas to Preserve

These items should be treated as regression-sensitive during all production work:

- Region filtering.
- Period filtering.
- Custom period fields.
- Admin menu behavior.
- Backup/export/import/reset controls.
- Help Center behavior.
- Help icon toggle behavior.
- Guided walkthrough behavior.
- New Project modal behavior.
- Existing project modal behavior.
- Scope-level file opening.
- Financial tab totals.
- Change order behavior.
- Cancellation date/reason behavior.
- Editable scope specifications.
- Editable measure requested fields.
- Critical Path Book CSV export.
- Print styling.
- TV Wallboard view.
- Fullscreen display behavior.

## Production Gap Assessment

### 1. Architecture and Maintainability

| Gap | Impact | Priority |
|---|---|---|
| Large dashboard file holds too many responsibilities | High risk of regressions and hard-to-review changes | Immediate |
| Business logic mixed with UI rendering | Calculations are harder to test and reuse | Immediate |
| Static/demo data mixed with live behavior | Harder to transition to shared database | Immediate |
| Modals and forms embedded in large component | High regression risk when adding production forms | High |
| CSV/print logic embedded with UI | Harder to maintain exports and reports | Medium-high |

### 2. Data Persistence

| Gap | Impact | Priority |
|---|---|---|
| Prototype storage is not a production shared database | Multiple users cannot reliably share live records | Immediate |
| No production database schema | Cannot support authentication, audit logs, or imports | Immediate |
| No migration strategy | Future data changes may be risky | High |
| No backup/restore process | Production data loss risk | High |

### 3. Data Model

| Gap | Impact | Priority |
|---|---|---|
| Customer/job/work-scope hierarchy needs formal schema | Multi-scope customers can become duplicated or confusing | Immediate |
| Salesperson attribution needs formal model | Sales scorecards cannot be trusted | High |
| Initial contract and final amount need separate fields | True job value may be inaccurate | High |
| Change orders need structured tracking | Final amount changes cannot be explained | High |
| Cancellation data needs structured tracking | Cancellation rate and retention metrics cannot be trusted | High |
| Paid/funded/collected status needs formal tracking | Completed work may be confused with collected revenue | High |

### 4. Authentication and Roles

| Gap | Impact | Priority |
|---|---|---|
| No production login system | Anyone with access may see/edit sensitive data | Immediate before launch |
| No role-based permissions | Sales, financial, and admin controls cannot be protected | Immediate before launch |
| No user profile model | Salespeople cannot own stats and activity | High |
| No wallboard read-only role | TV view could expose edit controls if not controlled | High |
| No user activity tracking | Edits are not accountable | High |

### 5. Workflow Completeness

| Gap | Impact | Priority |
|---|---|---|
| Manual Critical Path entry needs production flow | Hannah cannot fully replace the book yet | High |
| Work-scope-level production tracking needs validation | Multi-scope jobs may not track correctly | High |
| Bottleneck thresholds need business approval | Alerts may be misleading | Medium-high |
| Cycle-time calculations need source dates | Sold-to-measured and sold-to-completed metrics may be incomplete | High |
| Final amount tracking needs workflow | Sales totals may remain inaccurate | High |

### 6. Reporting and KPIs

| Gap | Impact | Priority |
|---|---|---|
| KPI definitions need final approval | Reports may not match management expectations | High |
| Salesperson scorecards need reliable source data | Coaching metrics may be disputed | High |
| Lead-source reporting needs data path | Value-per-lead cannot be calculated reliably | High |
| Production capacity report needs sales and production date alignment | Backlog/capacity risk may be missed | High |
| Exportable management reports need standard formats | Meetings still rely on manual spreadsheets | Medium-high |

### 7. Integration Readiness

| Gap | Impact | Priority |
|---|---|---|
| JobNimbus field mapping is not confirmed | API integration could import incomplete or misleading data | Medium-high |
| JobNimbus final amount reliability is not confirmed | Dashboard must not blindly trust initial estimate values | High |
| CSV import path is not productionized | Historical backfill and fallback imports are manual | Medium-high |
| QuickBooks integration is not scoped | Payment/funding status may remain manual | Later |

### 8. Deployment and Operations

| Gap | Impact | Priority |
|---|---|---|
| Production deployment process needs confirmation | Releases may be inconsistent | High |
| Environment separation is not defined | Development changes could affect production data | High |
| Error monitoring is not defined | Failures may go unnoticed | Medium-high |
| Browser/device support is not documented | TV, desktop, tablet, and mobile behavior may vary | Medium |
| Release rollback process is not documented | Bad deployments may be hard to recover from | High |

## Phase 0 Validation Checklist

Before Phase 0 is considered complete, confirm and document the following:

### Repository and Build

- [ ] Confirm default branch and active deployment branch.
- [ ] Confirm `npm install` succeeds.
- [ ] Confirm `npm run build` succeeds.
- [ ] Confirm whether lint/test scripts exist.
- [ ] Confirm whether GitHub Pages deployment is active.
- [ ] Confirm whether `/docs` is still used for compiled branch-based Pages output.

### Active App

- [ ] Confirm `src/main.jsx` imports the intended active dashboard component.
- [ ] Confirm the active dashboard file.
- [ ] Confirm no duplicate/experimental top-level dashboard view is visible.
- [ ] Confirm operator/admin dashboard remains the primary dashboard.
- [ ] Confirm TV Wallboard remains a selectable/read-only style view.

### Current Feature Smoke Test

- [ ] Dashboard loads.
- [ ] Region filter works.
- [ ] Period filter works.
- [ ] Custom date range works.
- [ ] Admin menu opens.
- [ ] Backup/export works.
- [ ] Import/reset controls still function.
- [ ] Help Center opens.
- [ ] Help icons toggle.
- [ ] Guided walkthrough starts.
- [ ] New Project modal opens.
- [ ] Existing project file opens.
- [ ] Work scope file opens.
- [ ] Scope specifications can be edited.
- [ ] Measure requested can be edited.
- [ ] Change orders can be added.
- [ ] Cancellation fields display and save.
- [ ] Critical Path Book CSV exports.
- [ ] Print view works.
- [ ] TV Wallboard opens cleanly.
- [ ] Fullscreen mode works.

### Production Data Readiness

- [ ] Confirm all current demo fields.
- [ ] Identify all hard-coded customer/job records.
- [ ] Identify all calculated metrics.
- [ ] Identify all fields that currently lack input paths.
- [ ] Identify all fields requiring manual entry.
- [ ] Identify all fields that might come from JobNimbus.
- [ ] Identify all fields that might come from Hannah's spreadsheets.
- [ ] Identify all fields that must be dashboard-owned.

### Security and Role Readiness

- [ ] List expected user roles.
- [ ] List expected named users or user categories.
- [ ] Identify sensitive fields.
- [ ] Identify edit-restricted fields.
- [ ] Identify report/export permissions.
- [ ] Identify wallboard access restrictions.

## Production Readiness Decision Matrix

Use this matrix after the Phase 0 assessment is completed.

| Area | Ready for production? | Required before launch |
|---|---|---|
| UI stability | Not yet | Stabilize current views and remove clutter |
| Code structure | Not yet | Refactor large file into maintainable modules |
| Shared data | Not yet | Add production database/backend |
| Authentication | Not yet | Add login, profiles, and protected routes |
| Roles/permissions | Not yet | Add permission matrix and enforcement |
| Critical Path workflow | Partially | Add production manual entry and validation |
| Sales tracking | Partially | Add salesperson profiles and source data |
| Final amount tracking | Partially | Add structured final amount/change order workflow |
| Imports | Not yet | Add CSV/XLSX import staging and validation |
| JobNimbus integration | Not required for launch | Perform field-mapping proof of concept |
| Wallboard | Partially | Add read-only role and TV validation |
| Reports | Partially | Finalize KPI formulas and exportable reports |
| Audit history | Not yet | Add activity log and sensitive-change tracking |
| Deployment | Partially | Confirm production hosting and rollback path |

## Recommended Phase 0 Acceptance Criteria

Phase 0 is complete when the repository contains:

1. This production-readiness assessment.
2. An updated README link to this assessment.
3. A confirmed list of active prototype files.
4. A confirmed production gap list.
5. A clear handoff to Phase 1 stabilization and Phase 2 refactor work.

## Recommended Next Implementation Phase

After Phase 0, the next repository work should be:

1. Stabilize the current prototype without adding new features.
2. Run build and browser smoke testing.
3. Begin the modular refactor described in `project-docs/refactor-plan.md`.
4. Preserve current visible behavior during refactor.
5. Only after refactor, add shared backend, authentication, roles, and production data workflows.

## Codex Handoff Prompt

Use this prompt for the next Codex run if continuing from Phase 0:

```txt
You are working in the AccelAnalysis/MLB-Dashboard repository.

Task: Complete the Phase 0 production-readiness verification for the MLB Dashboard and prepare the repo for Phase 1 stabilization.

Context:
- Phase 0 is documented in project-docs/phase-0-production-readiness-assessment.md.
- The existing refactor plan is documented in project-docs/refactor-plan.md.
- The current app is a React/Vite prototype for Major League Builders.
- The dashboard is intended to replace the physical whiteboard and Critical Path Book while supporting sales metrics, production bottlenecks, project files, change orders, final amount tracking, and a TV Wallboard.

Hard requirements:
1. Do not redesign the dashboard.
2. Do not add new views.
3. Do not remove existing views.
4. Do not change current labels, colors, spacing, layout, calculations, or navigation behavior.
5. Do not connect external services.
6. Do not add authentication or backend storage yet.
7. Do not change the data model yet.
8. Do not change help IDs or data-help-id attributes.
9. Do not alter TV Wallboard behavior.
10. Preserve the operator/admin dashboard as the primary dashboard.

Actions:
1. Inspect the current repo structure.
2. Confirm the active app import path in src/main.jsx.
3. Run the available install/build checks.
4. Identify any current build errors or warnings.
5. Confirm whether lint/test scripts exist before running them.
6. Smoke test the current prototype behavior if a browser environment is available.
7. Document findings in a short update under project-docs/phase-0-production-readiness-assessment.md or a separate phase-0-verification-notes.md file.
8. Do not make feature or UI behavior changes unless required only to fix a broken build.

Acceptance criteria:
- Build status is known.
- Active app file is documented.
- Major production gaps are documented.
- Current behavior preservation risks are documented.
- The repo is ready for Phase 1 stabilization and modular refactor work.
```
