# Major League Builders Dashboard — Field-by-Field Replacement Audit

## Purpose

This audit checks the current `MLB-Dashboard` prototype against the baseline replacement goal:

1. Replace the physical production whiteboard.
2. Replace the manual critical-path / production book.

The current application is directionally strong. It already models most of the whiteboard and book workflow, but it is not yet a complete operational replacement because the data is still front-end state/demo data and several field-level gaps remain.

## Baseline Source Observations

### Physical whiteboard

The whiteboard is organized by trade/product category and uses handwritten job entries with color-coded production dates/statuses.

Observed whiteboard trade columns:

- Roofs
- Roofs / overflow
- Repairs
- Siding
- Trim
- Gutters
- Windows
- Decks
- Doors
- Misc

Observed whiteboard color key:

- Measure date
- Order date
- Material ETA
- Materials IN
- Scheduled

The digital replacement should preserve both the high-level trade grouping and the color/status meaning, even if the TV Wallboard also adds a more useful production-flow view.

### Manual critical-path / production book

The book appears to function as MLB's detailed operating record for each sold job. Based on meeting notes and prototype requirements, it should track at least:

- Date sold
- Customer name
- Location/city
- Work type/scope
- Salesperson
- Lead source
- Payment type
- Contract amount
- Deposit/down payment
- Revised/final amount
- Change orders
- Crew/subcontractor
- Measurement status/date
- Material list status/date
- Order date
- Vendor/supplier
- Material ETA
- Materials received/in
- Scheduled install date
- Completion date
- Collection/funding/payment status
- Cancellation status
- Permit status
- Notes/decisions needed
- Customer/job-specific specifications
- Printable or exportable hard copy

## Current App Summary

The current app now has an Operator View and a TV Wallboard View. It includes these top-level views:

- Project Center
- Measurement Queue
- Bottlenecks
- Sales Metrics
- Critical Path Sync
- TV Wallboard

The app also supports project files with multiple work scopes under one customer, which is important because one MLB customer may have siding, trim, gutters, windows, decks, or other scopes that move through production on different timelines.

## Whiteboard Replacement Audit

| Whiteboard item | Current app coverage | Current app location / field | Status | Notes / gap |
|---|---|---|---|---|
| Trade columns: Roofs, Repairs, Siding, Trim, Gutters, Windows, Decks, Doors, Misc | Product categories exist | `PRODUCT_CATEGORIES` | Covered in data model | The current TV Wallboard is grouped by production stage, not by trade. Add a wallboard toggle for `Production Flow` vs `Trade Board` to fully mirror the physical board. |
| Two roof columns / overflow capacity | No explicit duplicate/overflow category | `Roofs` only | Partial | May not need literal duplicate column, but an overflow behavior or count indicator should exist for crowded categories. |
| Customer/job entry | Customer appears on project and wallboard cards | `project.customer` | Covered | Good replacement for handwritten customer names. |
| City/location under job | City/region appears on project/card | `project.city`, `project.region` | Covered | Useful for whiteboard replacement and scheduling. |
| Work type under job | Scopes are grouped under project | `scope.type` | Covered | Stronger than the board because multiple scopes can sit under one customer. |
| Measure date color/status | Measure status exists | `scope.measureRequested`, `scope.measureCompleted` | Partial | `measureCompleted` is editable; `measureRequested` exists in data but is not clearly editable in the scope form. Add a visible `Measure Requested` field and ensure the wallboard can display the actual measure date. |
| Order date color/status | Order date exists and is editable | `scope.dateOrdered` | Covered | Good match. |
| Material ETA color/status | ETA exists and is editable | `scope.materialETA` | Covered | Good match. |
| Materials IN color/status | Materials received date exists and is editable | `scope.materialsIn` | Covered | Good match. |
| Scheduled color/status | Scheduled install date exists and is editable | `scope.scheduledInstallDate` | Covered | Good match. |
| Completed / removed from board | Completion and closeout logic exists | `scope.completionDate`, `project.collected`, `project.thankYouSent` | Covered | App is stronger than whiteboard because completed-but-not-collected jobs remain visible in closeout. |
| Whiteboard color key | Wallboard includes a status key | TV Wallboard status key | Partial | The key is currently generalized. Add the exact whiteboard terms and colors: Measure date, Order date, Material ETA, Materials IN, Scheduled. |
| Visual board for big TV | TV Wallboard exists | `TVWallboardView` | Covered as prototype | Good. Still needs final visual validation on actual display size. |
| Jobs stuck / overdue | Alert logic exists | `getScopeAlerts`, `getProjectAlerts`, Bottleneck Spotlight | Covered | This is a major upgrade over the physical board. |
| Jobs grouped by where they are in production | Wallboard production columns exist | `WALLBOARD_COLUMNS`, `getWallboardColumn` | Covered | Useful operationally, but not a literal whiteboard replacement. Add trade-board toggle if MLB expects visual parity. |

### Whiteboard Replacement Verdict

The prototype is approximately **80% aligned** with replacing the whiteboard.

The main remaining whiteboard-specific gap is visual parity: MLB's physical board is category/trade-first, while the TV Wallboard is stage/status-first. The stage/status design is likely more useful, but a trade-category view should be added so the digital board can replace the wall board without changing how users think too quickly.

## Manual Book Replacement Audit

| Manual book field / requirement | Current app coverage | Current app location / field | Status | Notes / gap |
|---|---|---|---|---|
| Date sold | Exists and editable | `project.dateSold` | Covered | Core book field is present. |
| Customer name | Exists and editable | `project.customer` | Covered | Core book field is present. |
| City/location | Exists and editable | `project.city`, `project.region` | Covered | Region supports Virginia/Carolina filtering. |
| Phone/customer contact | Exists and editable | `project.phone` | Covered | Useful for production coordination. |
| Salesperson | Exists and editable | `project.salesperson` | Covered | Also used for sales metrics. |
| Lead source | Exists and editable | `project.leadSource` | Covered | Good for future sales reporting. |
| Payment type | Exists and editable | `project.paymentType` | Covered | Currently Cash/Finance. May need additional values later. |
| Original contract amount | Exists and editable | `project.originalAmount` | Covered | Good book replacement. |
| Deposit/down payment | Exists and editable | `project.deposit` | Covered | Good book replacement. |
| Revised/final amount | Calculated from original plus change orders | `getRevisedAmount(project)` | Partial | Good start, but the book may need separate `finalAmount`, `amountCollected`, or `balanceDue` fields. |
| Change orders | Exists and editable | `project.changeOrders` | Covered | Good upgrade over handwritten notes. |
| Collected/funded | Exists and editable | `project.collected` | Covered | Good match to completed/funded closeout. |
| Thank-you sent / close file | Exists and editable | `project.thankYouSent` | Covered | Useful closeout field. |
| Cancelled | Exists and editable | `project.cancelled` | Covered | Good. Needs cancellation reason/date for future reporting. |
| Work type / product category | Exists per scope | `scope.type` | Covered | Stronger than book because multiple scopes can be under one customer. |
| Multiple scopes under one customer | Supported | `project.scopes[]` | Covered | This directly solves duplicate customer entries across trade columns. |
| Measurer | Exists and editable | `scope.measurer` | Covered | Good match. |
| Measure requested date | Exists in sample data | `scope.measureRequested` | Partial | Field exists in data but is not clearly editable in the scope modal. Add it to the form. |
| Measure completed date | Exists and editable | `scope.measureCompleted` | Covered | Good match. |
| Material list received | Exists and editable | `scope.materialListReceived` | Covered | Good match for the bottleneck between measurement and ordering. |
| Date ordered | Exists and editable | `scope.dateOrdered` | Covered | Good match. |
| Vendor/supplier | Exists and editable | `scope.vendor` | Covered | Good. |
| Material ETA | Exists and editable | `scope.materialETA` | Covered | Good match. |
| Materials in/received | Exists and editable | `scope.materialsIn` | Covered | Good match. |
| Assigned crew/sub | Exists and editable | `scope.crew` | Covered | Good match. |
| Scheduled install | Exists and editable | `scope.scheduledInstallDate` | Covered | Good match. |
| Completion date | Exists and editable | `scope.completionDate` | Covered | Good match. |
| Scope notes | Exists and editable | `scope.notes` | Covered | Good match. |
| Project/general notes | Exists and editable | `project.notes` | Covered | Good match. |
| Decision needed for critical-path meeting | Exists and editable | `project.decisionNeeded` | Covered | Strong addition. |
| Permit tracking | Exists and editable | `project.permits` | Covered | Strong addition beyond basic whiteboard/book. |
| Work specs / work order details | Exists in sample data but not fully editable | `scope.specs` | Partial | The app displays specs in print/sample data, but the scope editor needs a practical way to add/edit work-order specs such as color, quantity, window grid, shingle type, trim color, etc. |
| Print / hard copy | Exists | `PrintView` | Covered as project printout | Needs a book-style table export for weekly critical-path meetings. |
| Weekly critical path view | Exists | `CriticalPathMeetingView` | Covered | Good match. |
| Measurement queue / jobs needing action | Exists | `MeasurementQueueView` | Covered | Strong addition beyond the book. |
| Bottleneck tracking | Exists | Alerts and Bottleneck view | Covered | Strong addition beyond the book. |
| Historical monthly/yearly totals | Partially supported through filters | `PERIODS`, `isInPeriod` | Partial | Current data model filters by date sold, but there is no durable reporting database yet. |
| Sales totals and rep performance | Exists as prototype | `SalesView`, `salesStats`, `salesActivity` | Partial | Leads are hardcoded demo values; real lead entry/import is needed. |

### Manual Book Replacement Verdict

The prototype is approximately **70% aligned** with replacing the manual book.

The data model is strong, but a true book replacement needs exact column parity, persistent shared storage, better printable/exportable book views, and editable work-order/spec fields.

## Critical Gaps Before MLB Can Stop Using the Whiteboard and Book

### 1. Persistent shared storage

Current issue: the app initializes project data in React state and saves changes only in local front-end state.

Required before operational use:

- Firebase, Supabase, or another shared database.
- Real create/update/delete persistence.
- Data survives refresh and is shared across devices.
- Basic user permissions or at least admin-only editing.

Priority: **Critical**

### 2. Exact whiteboard color/key parity

Current issue: the wallboard uses a useful generalized status key, but it does not exactly mirror the physical board's key.

Required:

- Add exact labels: Measure date, Order date, Material ETA, Materials IN, Scheduled.
- Use color assignments that match the physical board as closely as practical.
- Show this exact key on the TV Wallboard.

Priority: **High**

### 3. Trade-category board view

Current issue: the TV Wallboard is production-stage-first. The physical whiteboard is trade-category-first.

Required:

- Add toggle: `Production Flow` / `Trade Board`.
- Trade Board columns should be Roofs, Repairs, Siding, Trim, Gutters, Windows, Decks, Doors, Misc.
- Cards should still show status/date badges and alerts.

Priority: **High**

### 4. Manual book-style table/export

Current issue: project printout exists, but the manual book is more like a critical-path ledger.

Required:

- Add `Book View` or `Critical Path Book` table.
- One row per project/scope.
- Columns should include date sold, customer, city, scope, salesperson, amount, measure date, order date, material ETA, materials in, scheduled, crew, completion, collected/funded, and notes.
- Add print/export-friendly layout.

Priority: **High**

### 5. Editable measure requested date

Current issue: `measureRequested` exists in sample data but is not exposed clearly in the scope editor.

Required:

- Add `Measure Requested` date input to scope editor.
- Show this in measurement queue and/or book view.

Priority: **Medium-High**

### 6. Editable work-order/spec fields

Current issue: sample data contains `scope.specs`, but the UI does not provide a full way to edit structured specs.

Required:

- Add a simple key/value spec editor per scope.
- Examples: shingle color, siding color, window quantity, grid yes/no, trim color, gutter size, deck material.
- Keep flexible rather than making every trade over-structured too early.

Priority: **Medium-High**

### 7. Final amount / balance due clarity

Current issue: revised amount is calculated from original amount plus change orders, but the book may need clearer accounting fields.

Required:

- Add or confirm fields for final amount, amount collected, balance due, funded date, and possibly financing status.
- Avoid conflicting with QuickBooks when integration happens.

Priority: **Medium**

### 8. Cancellation details

Current issue: cancellation is a boolean.

Required:

- Add cancellation date.
- Add cancellation reason.
- Add cancellation rate to sales reporting.

Priority: **Medium**

### 9. Real sales lead data

Current issue: sales lead counts are hardcoded demo values.

Required:

- Add lead entry/import model.
- Track leads given by salesperson, period, and lead source.
- Calculate close rate and value per lead from real data.

Priority: **Medium**

### 10. Audit history / change log

Current issue: changes overwrite state with no history.

Required later:

- Track who updated what and when.
- Helpful if Hannah, Jimmy, sales, and production all use it.

Priority: **Later, but important**

## Recommended Implementation Order

### Phase 1 — Make the prototype field-complete

1. Add exact whiteboard color/status key.
2. Add `Trade Board` toggle to TV Wallboard.
3. Add `Critical Path Book` table view.
4. Add editable `measureRequested` field.
5. Add editable `scope.specs` key/value editor.
6. Add cancellation date/reason fields.

### Phase 2 — Make it operationally usable

1. Add persistent shared storage.
2. Add basic authentication/admin editing.
3. Add import/export or backup CSV.
4. Add print-friendly weekly book report.

### Phase 3 — Integrate and automate

1. JobNimbus sync/import.
2. QuickBooks financial sync or reconciliation fields.
3. Customer communication automation.
4. Sales lead source reporting and coaching dashboard.

## Acceptance Criteria for a True Baseline Replacement

The app can be considered a baseline replacement when:

- Hannah can enter a sold job once and it appears on the digital board automatically.
- Every field currently written in the book has a digital location.
- Every colored date/status currently written on the board has a digital equivalent.
- Jimmy can run critical path from the dashboard without the book in front of him.
- The TV view can stay on screen during the workday without requiring clicks.
- The office can print/export a hard copy if desired.
- Data is saved permanently and shared across devices.
- Completed/collected jobs can be closed and archived without disappearing prematurely from needed reports.

## Current Readiness Estimate

| Replacement target | Prototype readiness | Production readiness |
|---|---:|---:|
| Whiteboard replacement | 80% | 50% |
| Manual book replacement | 70% | 45% |
| Combined daily operating system | 75% | 45% |

## Conclusion

The dashboard is on the correct path. It already goes beyond the whiteboard/book by adding bottleneck alerts, measurement queue, sales metrics, and critical path spotlighting. The next build step should not be more general dashboard polish. The next build step should be field-completion and parity: exact whiteboard status key, trade-board layout, critical-path book table, editable measure-request date, editable work specs, and durable shared storage.
