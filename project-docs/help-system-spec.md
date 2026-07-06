# MLB Dashboard Help System Specification

## Purpose

The MLB Dashboard is replacing two familiar manual tools: the paper Critical Path Book and the physical whiteboard. The help system should make the digital dashboard feel like a guided replacement for those manual tools, not like a new system users must decode on their own.

This document defines the recommended Help Center, contextual question-mark icons, and guided walkthrough overlay.

## Core UX Direction

The help system should be available from the existing admin/user icon dropdown, not as a permanent top-level header button. This keeps the dashboard clean during normal use.

The Help Center should support two different help behaviors:

1. Contextual help mode
   - Activated from the admin/user dropdown.
   - Adds small question-mark icons beside important elements.
   - Each question-mark icon opens an explanation for the nearby element.
   - Help icons can be turned off to remove clutter.

2. Guided walkthrough overlay
   - Launched from inside the Help Center drawer.
   - Walks the user through the dashboard step by step.
   - Highlights one element at a time.
   - Includes Next, Back, Skip, and Done controls.

## Entry Point

### Admin/User Dropdown

Add help actions inside the existing admin/user icon dropdown.

Recommended menu items:

- Help Center
- Turn Help Icons On
- Turn Help Icons Off
- Start Guided Walkthrough

Behavior:

- Selecting Help Center opens the Help Center drawer.
- Selecting Turn Help Icons On activates contextual help icons across the current screen.
- Selecting Turn Help Icons Off hides those icons.
- Selecting Start Guided Walkthrough opens the Help Center drawer if closed and starts the guided walkthrough overlay.

The dropdown already contains admin tools such as export backup, import backup, and reset demo data. Help should be grouped separately from those admin data actions.

## Help Center Drawer

### Placement

The Help Center should slide in from the right side of the screen.

### Behavior

- Drawer can open and close without leaving the current dashboard view.
- Drawer should not block normal use unless a guided walkthrough is running.
- Drawer should show current screen help first.
- Drawer should include a button to start the guided walkthrough overlay.
- Drawer should include a toggle for contextual help icons.

### Suggested Drawer Structure

1. Header
   - Title: Help Center
   - Subtitle: Learn how this dashboard replaces the Critical Path Book and whiteboard.
   - Close button.

2. Current Screen Help
   - Area-specific explanation based on the current main area and mode.
   - Example: Production > Book, Bottlenecks > Measurement, Sales, TV Wallboard.

3. Walkthrough Controls
   - Start full dashboard walkthrough.
   - Start this screen walkthrough.
   - Restart onboarding.

4. Manual Process Map
   - Critical Path Book -> Production > Book
   - Weekly Critical Path Meeting -> Production > Meeting
   - Physical Whiteboard -> TV Wallboard
   - Measuring follow-up -> Bottlenecks > Measurement
   - Sales spreadsheet / manual totals -> Sales
   - Customer/job folder -> Production > Customer / Open File

5. Field Guide
   - Short explanations for key fields and dashboard terms.

## Contextual Question-Mark Icons

### Purpose

Question-mark icons provide direct element-level help. Users should be able to turn them on only when needed.

### Appearance

- Small circular icon with a question mark.
- Should be visually noticeable but not distracting.
- Use consistent placement near headings, controls, tables, cards, and special buttons.
- Should have keyboard focus support.

### Behavior

When the user clicks a question-mark icon:

Option A: Open a compact popover next to the element.

Option B: Open the Help Center drawer and populate it with the selected help topic.

Preferred behavior:

- On desktop: open a compact popover with a link/button for "Open in Help Center."
- On mobile: open the Help Center drawer directly to avoid cramped popovers.

### Toggle Behavior

- Help icons are hidden by default.
- Help icons become visible after user selects Turn Help Icons On.
- Help icons are hidden after user selects Turn Help Icons Off.
- Store the user's preference in localStorage.

Suggested localStorage key:

- `mlb-dashboard-help-v1`

Suggested stored state:

- `helpIconsEnabled`
- `completedTours`
- `lastOpenedHelpTopic`

## Guided Walkthrough Overlay

### Purpose

The guided walkthrough is for first-time onboarding, training, and review.

### Behavior

- Dims the page.
- Highlights one target element at a time.
- Shows a tooltip/card with title, explanation, manual equivalent, and action guidance.
- Includes Back, Next, Skip, and Done buttons.
- Allows Esc to close.
- Keeps the user on the correct area/mode for each step.
- If a step belongs to a different area/mode, the walkthrough should navigate there before showing that step.

### Suggested Step Card Fields

Each guided step should include:

- Title
- Short explanation
- Manual equivalent
- Why it matters
- What to do here

### Example Step Card

Title: Production

Explanation: Production is the main job management area. It brings together the customer file, critical path book, and production tracking.

Manual equivalent: Customer folder + Critical Path Book.

Why it matters: This is where active job records are reviewed and edited.

What to do here: Choose Customer, Book, or Meeting depending on how you want to view the same production data.

## Help Registry Data Model

Implement help content through a reusable registry, not hard-coded individual popups.

Recommended help item shape:

```js
{
  id: 'production-main-nav',
  area: 'production',
  mode: 'customer',
  target: '[data-help-id="production-main-nav"]',
  title: 'Production',
  summary: 'The main job management area.',
  body: 'Production brings together the customer file, critical path book, and meeting view.',
  manualEquivalent: 'Customer/job folder and Critical Path Book',
  role: ['admin', 'owner', 'production'],
  tour: 'full-dashboard',
  order: 10
}
```

Recommended fields:

- `id`: stable unique ID.
- `area`: production, bottlenecks, sales, wallboard, global, modal.
- `mode`: customer, book, meeting, all, measurement, or null.
- `target`: CSS selector or data-help-id.
- `title`: display title.
- `summary`: short one-line explanation.
- `body`: longer explanation.
- `manualEquivalent`: original manual process/item this replaces or supports.
- `role`: optional role tags.
- `tour`: tour grouping.
- `order`: sort order.

## Required Data Attributes

Add `data-help-id` attributes to important elements so help targeting is stable and does not depend on fragile CSS selectors.

Recommended targets:

Global/header:

- `global-main-nav`
- `global-region-filter`
- `global-period-filter`
- `global-admin-menu`
- `global-new-project`

Admin dropdown/help:

- `admin-help-center`
- `admin-help-icons-toggle`
- `admin-start-walkthrough`
- `admin-export-backup`
- `admin-import-backup`
- `admin-reset-demo-data`

Production navigation:

- `production-subnav`
- `production-customer-mode`
- `production-book-mode`
- `production-meeting-mode`

Production > Customer:

- `customer-view-summary`
- `customer-project-card`
- `customer-scope-card`
- `customer-open-file`
- `customer-alert-badge`
- `customer-current-total`

Production > Book:

- `book-view-header`
- `book-status-key`
- `book-export-csv`
- `book-print-book`
- `book-open-file`
- `book-date-columns`
- `book-alert-notes`

Production > Meeting:

- `meeting-view-header`
- `meeting-project-scopes`
- `meeting-current-status`
- `meeting-next-action`
- `meeting-decision-needed`

Bottlenecks:

- `bottlenecks-subnav`
- `bottlenecks-all-filter`
- `bottlenecks-measurement-filter`
- `bottleneck-alert-card`
- `bottleneck-days-stuck`
- `bottleneck-open-file`

Measurement:

- `measurement-queue-header`
- `measurement-days-since-request`
- `measurement-measurer`
- `measurement-material-list-received`
- `measurement-open-file`

Sales:

- `sales-summary-metrics`
- `sales-revenue`
- `sales-projects-sold`
- `sales-leads-given`
- `sales-close-rate`
- `sales-cancel-rate`
- `salesperson-performance-table`
- `sales-value-per-lead`

TV Wallboard:

- `wallboard-header`
- `wallboard-production-flow-toggle`
- `wallboard-trade-board-toggle`
- `wallboard-display-mode`
- `wallboard-kpi-active-pipeline`
- `wallboard-kpi-open-alerts`
- `wallboard-kpi-collection-needed`
- `wallboard-status-columns`
- `wallboard-bottleneck-spotlight`
- `wallboard-sales-snapshot`
- `wallboard-critical-path-spotlight`

Project modal:

- `modal-overview-tab`
- `modal-scopes-tab`
- `modal-financials-tab`
- `modal-intake-checklist`
- `modal-permit-tracking`
- `modal-meeting-notes`
- `modal-general-notes`
- `modal-scope-measurement-fields`
- `modal-scope-production-schedule`
- `modal-scope-work-order-specs`
- `modal-financial-change-orders`
- `modal-collected-funded`
- `modal-cancellation-fields`

## Core Help Content

### Global Main Navigation

Title: Main Navigation

Summary: The dashboard is organized into four main areas.

Body: Use Production for job management, Bottlenecks for stuck work, Sales for sales performance, and TV Wallboard for the big-screen display. The app is one shared job system with different views of the same records.

Manual equivalent: The office's critical path book, whiteboard, sales tracking sheets, and meeting discussions.

### Region Filter

Title: Region Filter

Summary: Filter the dashboard by location.

Body: Use this to view All work or narrow the dashboard to Virginia or Carolina. This affects production, bottlenecks, sales, and wallboard views.

Manual equivalent: Separate location boards or location-specific review conversations.

### Period Filter

Title: Period Filter

Summary: Filter by time period.

Body: Use MTD, QTD, YTD, or All to adjust which sold jobs and sales numbers are included.

Manual equivalent: Monthly, quarterly, and year-to-date sales/production review.

### New Project

Title: New Project

Summary: Start a new digital job record.

Body: Use New Project when a contract has been received and the job needs to be entered into the dashboard. The project file can include customer details, scopes, dates, financials, permits, notes, and cancellation information.

Manual equivalent: Creating a physical job file and adding a job to the Critical Path Book.

### Production Area

Title: Production

Summary: The main job management area.

Body: Production contains three ways to look at the same production data: Customer, Book, and Meeting. Customer groups work by customer file. Book shows the critical path ledger. Meeting focuses the weekly critical path conversation.

Manual equivalent: Customer folder + Critical Path Book + weekly critical path meeting.

### Production > Customer

Title: Customer View

Summary: Group all scopes under the customer.

Body: Customer View keeps multiple scopes under one customer record. This prevents the same customer from being scattered across the board when they have roof, siding, windows, gutters, trim, or other work scopes.

Manual equivalent: Customer/job folder plus notes from the book and board.

### Production > Book

Title: Book View

Summary: The digital Critical Path Book.

Body: Book View is the closest replacement for the paper production ledger. Each row represents a job scope and shows dates such as Date Sold, Measure Requested, Measure Date, Order Date, Material ETA, Materials In, Scheduled, Completion, and Collected.

Manual equivalent: Paper Critical Path Book.

### Book Open File

Title: Open File

Summary: Edit the job record directly from the book.

Body: Use Open File when you find a row that needs an update. This prevents extra navigation back to Customer View and keeps the book workflow efficient.

Manual equivalent: Finding a job in the book and then updating the file or notes.

### Status Key

Title: Status Key

Summary: Color-coded dates and statuses.

Body: The status key helps users quickly identify important production dates and stuck items. Measure Date, Order Date, Material ETA, Materials In, Scheduled, and urgent/stuck alerts use consistent badges across the dashboard.

Manual equivalent: The color/status language from the physical whiteboard.

### Production > Meeting

Title: Meeting View

Summary: Weekly critical path meeting agenda.

Body: Meeting View strips the production data down to what is needed for the weekly conversation: project/scopes, value, current status, next action, and decision needed.

Manual equivalent: Hannah and Jimmy reviewing the Critical Path Book together.

### Bottlenecks Area

Title: Bottlenecks

Summary: Find stuck work quickly.

Body: Bottlenecks pulls forward jobs and scopes that need attention. It helps users avoid scanning the whole book or board to find late measurement, missing material lists, unscheduled work, late materials, collection issues, or decision needs.

Manual equivalent: Manually scanning the book and whiteboard for stuck jobs.

### Bottlenecks > Measurement

Title: Measurement Filter

Summary: Focus on the sold-to-measured bottleneck.

Body: Measurement shows work that needs measurement or a material list before materials can be ordered. This supports the goal of reducing delay between sold date, measurement, material list, and ordering.

Manual equivalent: Calling or texting measurers and checking the book to see what still needs measurement.

### Days Stuck

Title: Days Stuck

Summary: Shows how long an item has waited.

Body: Days stuck helps prioritize follow-up. Items with higher days stuck should usually be reviewed first, especially if measurement, materials, scheduling, or installation is overdue.

Manual equivalent: Remembering how long a job has been sitting in the same stage.

### Sales Area

Title: Sales

Summary: Sales performance and coaching view.

Body: Sales shows revenue, projects sold, leads given, close rate, cancel rate, average contract, value per lead, and salesperson performance. This is used for management and coaching, not detailed production scheduling.

Manual equivalent: Sales spreadsheet, sales meeting notes, and manual totals.

### Value Per Lead

Title: Value Per Lead

Summary: Revenue divided by leads.

Body: Value per lead helps compare how much revenue is generated from the leads assigned to each salesperson. It supports coaching and sales performance review.

Manual equivalent: Manually comparing leads given to revenue created.

### TV Wallboard

Title: TV Wallboard

Summary: Digital replacement for the physical whiteboard.

Body: TV Wallboard is designed for the big screen. It gives a quick visual snapshot of active work, open alerts, production stages, scheduled scopes, collection needs, sales snapshot, and critical path spotlight.

Manual equivalent: Physical whiteboard in the office.

### Production Flow

Title: Production Flow

Summary: View work by production stage.

Body: Production Flow groups scopes by where they are in the production process: Needs Measurer, Measure/List Needed, Ready to Order, Ordered/Waiting Materials, Materials In/Ready to Schedule, Scheduled, and Collection/Closeout.

Manual equivalent: Whiteboard organized by progress/status.

### Trade Board

Title: Trade Board

Summary: View work by trade or product type.

Body: Trade Board groups scopes by work category such as roofs, repairs, siding, trim, gutters, windows, decks, doors, and miscellaneous work.

Manual equivalent: Whiteboard organized by trade/category.

### Display Mode

Title: Display Mode

Summary: Full-screen TV view.

Body: Display Mode expands the wallboard for a large screen. Use this for the office TV or video wall. It is meant for viewing, not detailed editing.

Manual equivalent: Replacing the back-room whiteboard with a TV display.

### Project Modal

Title: Project File

Summary: The editable record for a customer/job.

Body: The project file contains the details that drive all dashboard views: customer information, sales data, intake checklist, scopes, measurement dates, material dates, scheduling, financials, permits, notes, change orders, collection, and cancellation details.

Manual equivalent: Physical customer file, Critical Path Book entry, notes, and board updates.

### Scope Fields

Title: Work Scope

Summary: One part of the customer job.

Body: A scope is a specific type of work under a customer, such as roof, siding, windows, gutters, trim, decks, doors, repairs, or miscellaneous work. Each scope has its own measurement, material, schedule, crew, completion, notes, and specs.

Manual equivalent: Separate lines or notes for each type of work under the same customer.

### Work Order Specs

Title: Work Order Specs

Summary: Detailed installation/order information.

Body: Specs capture the details needed to order materials and communicate with subcontractors, such as color, size, window style, grid, trim, material type, or other product details.

Manual equivalent: Work order details and notes needed before ordering materials.

### Change Orders

Title: Change Orders

Summary: Adjust the original contract amount.

Body: Use change orders when the final job value changes because of bad wood, added work, or other approved changes. The revised total updates the dashboard numbers.

Manual equivalent: Updating the book or spreadsheet when the original contract price changes.

### Cancellation Fields

Title: Cancellation Date and Reason

Summary: Track cancelled jobs clearly.

Body: If a job cancels, record the cancellation date and reason. This supports accurate cancellation rate tracking and keeps cancelled jobs from being confused with active work.

Manual equivalent: Marking a job cancelled in the book and retaining a reason for sales/operations review.

## Suggested Guided Tours

### Full Dashboard Tour

Order:

1. Main Navigation
2. Region Filter
3. Period Filter
4. Production
5. Production > Customer
6. Production > Book
7. Open File from Book
8. Production > Meeting
9. Bottlenecks
10. Measurement Filter
11. Sales
12. TV Wallboard
13. Display Mode
14. Admin Tools and Help Center

### Production Tour

Order:

1. Production Area
2. Customer View
3. Customer Project Card
4. Scope Card
5. Open File
6. Book View
7. Status Key
8. Open File from Book
9. Meeting View
10. Decision Needed

### Bottlenecks Tour

Order:

1. Bottlenecks Area
2. All Filter
3. Bottleneck Alert Cards
4. Days Stuck
5. Measurement Filter
6. Measurement Queue
7. Open File

### Sales Tour

Order:

1. Sales Area
2. Sales Revenue
3. Projects Sold
4. Leads Given
5. Close Rate
6. Cancel Rate
7. Salesperson Performance Table
8. Value Per Lead

### TV Wallboard Tour

Order:

1. TV Wallboard
2. Production Flow
3. Trade Board
4. Display Mode
5. KPI Cards
6. Status Columns
7. Bottleneck Spotlight
8. Sales Snapshot
9. Critical Path Spotlight

### Project File Tour

Order:

1. Project File
2. Overview Tab
3. Intake Checklist
4. Permit Tracking
5. Scopes Tab
6. Measurement Fields
7. Production Schedule
8. Work Order Specs
9. Financials Tab
10. Change Orders
11. Collected/Funded
12. Cancellation Date/Reason
13. Save Project

## Implementation Recommendations

1. Create a new help registry file.

Recommended path:

- `src/help/helpContent.js`

2. Create reusable components.

Recommended components:

- `HelpCenterDrawer.jsx`
- `HelpIcon.jsx`
- `GuidedWalkthrough.jsx`
- `HelpProvider.jsx` or a local hook inside `MLBDashboard_field_complete.jsx`

3. Avoid using external libraries unless necessary.

A custom lightweight implementation is sufficient for this prototype.

4. Use `data-help-id` attributes for targets.

Do not rely on `nth-child` selectors or fragile class names.

5. Make it safe for TV Wallboard display mode.

When TV Wallboard Display Mode is active, do not show help icons by default. If Help Center is opened from non-display mode and then Display Mode is entered, hide help drawer and help icons.

6. Preserve current dashboard behavior.

Help implementation should not alter project data, filters, import/export, print, display mode, or modal save behavior.

## Acceptance Criteria

- Help entry point is inside the admin/user dropdown.
- User can turn contextual question-mark icons on and off.
- Question-mark icons explain the nearby element through a popover or Help Center drawer.
- Help Center drawer opens from the admin/user dropdown.
- Help Center drawer includes a button to start the guided walkthrough overlay.
- Guided walkthrough can step through main nav, subnav, filters, major cards, Book view, Measurement view, Sales, TV Wallboard, and Project Modal.
- Help content connects dashboard elements back to the manual Critical Path Book, physical whiteboard, weekly critical path meeting, and sales tracking process.
- Help icon visibility and completed tours are persisted in localStorage.
- The app builds successfully after implementation.
