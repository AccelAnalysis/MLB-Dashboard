# Clickable Navigation and Period Filter Plan

## Purpose

This plan defines a usability refinement pass for the MLB Dashboard. The goal is to make visible records behave like intuitive entry points into the underlying project file, while also expanding the date/period filtering controls so users can review production and sales data at more useful time intervals.

This is a planning document for implementation by Codex. It should not be treated as a redesign. The existing four-area navigation should remain:

- Production
- Bottlenecks
- Sales
- TV Wallboard

The changes below are intended to reduce extra clicks, remove unnecessary action columns, and make the interface feel more natural to users who are moving from the paper Critical Path Book and physical whiteboard into the digital dashboard.

## Current Observations

### Current Period Filter

The current period options are limited to:

- MTD
- QTD
- YTD
- All

The current period logic only handles MTD, QTD, YTD, and All.

### Current Critical Path Book

The Critical Path Book currently includes an extra `Action` column with an `Open File` button on each row.

This works functionally, but it makes the ledger feel less clean and adds visual clutter. Because each row already represents a record, the user should be able to click the row itself.

### Current Customer View

In Production > Customer, each customer can expand to show work scope cards. Those scope cards currently summarize the scope, status, next action, date badges, crew/sub, and ETA. However, the cards themselves do not open the project file or jump into the Work Scopes tab.

This creates a mismatch: the user sees the exact work scope they want to edit, but must then use another Open File control and navigate inside the modal.

### Current Measurement Queue

The Measurement Queue currently has an `Action` column with an `Open File` button. Like the Critical Path Book, the row itself can serve as the action target.

### Current Critical Path Meeting View

The Meeting view lists projects and scope status/next action cards, but rows/cards are not direct edit entry points. During a meeting, users are likely to point at a project or scope and expect to open it.

### Current Bottlenecks View

The Bottlenecks view already uses clickable project/scope buttons inside each alert card. This is a good pattern and should be preserved.

### Current TV Wallboard

The TV Wallboard displays scope cards, bottleneck spotlight items, sales snapshot, and critical path spotlight items. In normal dashboard mode, clicking visible cards could be helpful. In full TV display mode, click-to-edit should not be emphasized because the view is intended for display.

## Implementation Goals

1. Remove unnecessary action columns where the row itself can open the record.
2. Make work scope cards clickable when they visibly represent editable scope details.
3. Add deeper period filter options:
   - Today
   - WTD / Week to Date
   - MTD / Month to Date
   - QTD / Quarter to Date
   - YTD / Year to Date
   - All
   - Custom
4. Add custom date range controls when Custom is selected.
5. Preserve current region filtering.
6. Preserve existing project data, scope data, export, print, import/export backup, wallboard display mode, and local storage behavior.
7. Keep click targets accessible, keyboard-friendly, and visually clear.

## Detailed Change Plan

## 1. Critical Path Book: Make Whole Row Clickable

### Current Issue

The Critical Path Book currently has an Action column with an Open File button. This is functional but visually clunky.

### Required Change

- Remove the `Action` column from the Critical Path Book table.
- Remove the visible `Open File` button from each row.
- Make each data row clickable.
- Clicking a row should open the related project file.
- Because each Book row represents a scope, the preferred behavior is:
  - Open the project modal.
  - Default to the Work Scopes tab.
  - Highlight or scroll to the clicked scope if possible.
  - Do not immediately open the nested scope editor unless Codex can do this cleanly without making the interaction feel abrupt.

### UX Requirements

- Add `cursor-pointer` to clickable rows.
- Add hover styling that clearly indicates the row is clickable.
- Add keyboard access with `tabIndex={0}` and `onKeyDown` handling for Enter and Space.
- Add an accessible label such as `aria-label="Open Smith Family Windows scope"`.
- Avoid interfering with Export CSV and Print Book.
- Keep print view clean; clickable behavior should not affect printing.

### Notes

If highlighting a clicked scope inside the Project Modal requires more complexity, implement the first version as:

- Row opens project modal to Work Scopes tab.

Then add scope highlight as a secondary refinement.

## 2. Period Filter: Add Today, WTD, and Custom

### Current Issue

The Period filter does not support Today, Week to Date, or custom date range analysis.

### Required Options

Use this order:

1. Today
2. WTD
3. MTD
4. QTD
5. YTD
6. All
7. Custom

Labels can display as:

- Today
- WTD
- MTD
- QTD
- YTD
- All
- Custom

Optional expanded labels may be added in helper text or title attributes:

- WTD = Week to Date
- MTD = Month to Date
- QTD = Quarter to Date
- YTD = Year to Date

### Date Logic

Update the period calculation helper so it supports:

- Today: date equals today's local date.
- WTD: date is greater than or equal to the start of the current week and less than or equal to today.
- MTD: date is greater than or equal to the first day of current month.
- QTD: date is greater than or equal to the first day of current quarter.
- YTD: date is greater than or equal to January 1 of current year.
- All: always true.
- Custom: date is within the user-selected start and end date range.

### Week Start

Use Monday as the start of week unless the business specifically requests Sunday later. Monday is recommended because it aligns better with work-week review.

### Custom Date Range UI

When Period = Custom:

- Show Start Date input.
- Show End Date input.
- If only Start Date is set, include records on or after Start Date.
- If only End Date is set, include records on or before End Date.
- If both are set, include records between those dates inclusive.
- If neither is set, treat Custom as All or show a subtle validation message. Preferred: treat as All and display helper text: `Select a start and/or end date to narrow results.`

### Persistence

Persist these values in the existing dashboard UI localStorage state:

- `periodFilter`
- `customPeriodStart`
- `customPeriodEnd`

### Display Text

Where the app displays current period context, use a helper such as `getPeriodLabel(periodFilter, customPeriodStart, customPeriodEnd)` so cards do not say only `Custom` without dates.

Examples:

- `Today`
- `WTD`
- `Custom: Jan 1, 2026 - Jan 31, 2026`
- `Custom: Since Jan 1, 2026`
- `Custom: Through Jan 31, 2026`

## 3. Customer View: Make Work Scope Cards Clickable

### Current Issue

In Production > Customer, each expanded work scope card shows status, next action, date badges, crew/sub, and ETA. These cards should be direct entry points.

### Required Change

- Make each work scope card clickable.
- Clicking a scope card should open the project modal directly to the Work Scopes tab.
- The clicked scope should be highlighted or scrolled into view.
- If feasible, the clicked scope can open the nested scope editor directly, but this should be a deliberate design choice.

### Preferred Behavior

First implementation:

- Click scope card -> open Project Modal -> Work Scopes tab -> clicked scope highlighted.

Optional future behavior:

- Double-click scope card, or click an Edit affordance inside modal -> open nested scope editor.

### UX Requirements

- Show `cursor-pointer` and hover border/background on scope cards.
- Add text hint for accessibility, such as `aria-label="Open Smith Family Windows scope"`.
- Add keyboard activation.
- Preserve expand/collapse behavior of the customer card header.
- Clicking the customer header should still expand/collapse.
- Existing Open File button on the customer card may remain for opening the overview tab.

## 4. Measurement Queue: Make Rows Clickable

### Current Issue

The Measurement Queue still uses an Action column with Open File.

### Required Change

- Remove the Action column.
- Make the whole row clickable.
- Clicking a row should open the project modal to the Work Scopes tab and highlight the matching scope.
- The row should have hover, cursor, keyboard access, and an accessible label.

### Rationale

Measurement Queue rows represent a specific customer/scope item. The visible row is the natural clickable target.

## 5. Critical Path Meeting View: Make Meeting Rows/Scope Cards Clickable

### Current Issue

During the weekly meeting, users will likely identify a project or scope from the row and want to open it immediately.

### Required Change

- Make the project row clickable to open the project modal.
- If clicking on a specific scope status card within the row, open the Work Scopes tab and highlight that scope.
- If clicking on the Decision Needed / Notes area, open the project modal to the Overview tab where meeting notes and general notes are edited.

### UX Requirements

- Avoid nested click conflicts.
- Use `event.stopPropagation()` where needed for scope cards inside clickable rows.
- Use hover styling on rows and scope cards.
- Add keyboard activation where practical.

## 6. Bottlenecks View: Preserve and Refine Existing Click Behavior

### Current State

The Bottlenecks view already renders affected items as clickable buttons that open the project file.

### Recommended Refinement

- When an alert item is tied to a specific scope, open the project modal to the Work Scopes tab and highlight that scope.
- When an alert is project-level, such as Collection Needed or Decision Needed:
  - Collection Needed should open Financials & Changes.
  - Decision Needed should open Overview & Intake where meeting notes are edited.
- Keep the current visible button style because it already communicates clickability.

## 7. TV Wallboard: Clickable in Normal Mode Only

### Current Issue

The TV Wallboard cards are visually rich but not direct edit entry points.

### Required Change

When not in full Display Mode:

- Scope wallboard cards should be clickable.
- Clicking a scope card should open the project modal to the Work Scopes tab and highlight the scope.
- Bottleneck Spotlight items should open the relevant project/scope.
- Critical Path Spotlight items should open the relevant project/scope or relevant tab based on alert type.

When in Display Mode:

- Do not show hover/click edit behavior.
- Avoid opening modals accidentally.
- Keep the wallboard presentation clean.

## 8. Executive Summary Cards: Optional Navigation Shortcuts

### Recommended Optional Improvement

The executive summary cards can act as navigation shortcuts:

- Open Alerts -> Bottlenecks > All
- Scheduled Scopes -> TV Wallboard or Production > Book
- Avg Sold to Done -> Sales or Production Book depending on interpretation
- Active Pipeline -> Production > Customer

This is optional and should not be implemented if it makes the dashboard feel confusing. If implemented, only make the obvious cards clickable first:

- Open Alerts -> Bottlenecks > All
- Active Pipeline -> Production > Customer

## 9. Sales Table: Do Not Force Click Behavior Yet

The Sales table is aggregated by salesperson and does not currently have a dedicated salesperson drill-down view. Do not add confusing click behavior unless a filtered project list by salesperson is added.

Potential future improvement:

- Click salesperson row -> filter Production to that salesperson's projects.

This should be considered later after user feedback.

## 10. Modal Deep-Linking Design

Several changes above require opening the project modal to a specific tab or scope.

### Recommended State Pattern

Replace simple `selectedProject` state with a richer modal state while preserving compatibility.

Example:

```js
const [projectModalState, setProjectModalState] = useState(null);

const openProjectFile = (project, options = {}) => {
  setProjectModalState({
    project,
    initialTab: options.initialTab || 'overview',
    initialScopeId: options.initialScopeId || null,
    focusArea: options.focusArea || null,
  });
};
```

Then update `ProjectModal` props:

```jsx
<ProjectModal
  project={projectModalState.project}
  initialTab={projectModalState.initialTab}
  initialScopeId={projectModalState.initialScopeId}
  focusArea={projectModalState.focusArea}
  onClose={() => setProjectModalState(null)}
  onSave={saveProject}
/>
```

### ProjectModal Behavior

- Initial active tab should come from `initialTab`.
- If `initialScopeId` is provided and the scopes tab is active:
  - Add temporary highlight styling to the matching scope card.
  - Scroll it into view after modal opens.
- If `focusArea` is provided:
  - Use it to choose Overview, Scopes, or Financials.

Suggested mapping:

- Scope item -> `initialTab: 'scopes'`, `initialScopeId: scope.id`
- Book row with scope -> `initialTab: 'scopes'`, `initialScopeId: scope.id`
- Book row with no scope -> `initialTab: 'overview'`
- Measurement row -> `initialTab: 'scopes'`, `initialScopeId: scope.id`
- Collection Needed -> `initialTab: 'financials'`
- Decision Needed -> `initialTab: 'overview'`
- Customer file open button -> `initialTab: 'overview'`

## 11. Accessibility Requirements

All clickable rows/cards should be accessible.

Use:

- `role="button"` where a non-button element is clickable.
- `tabIndex={0}`.
- `onKeyDown` for Enter and Space.
- Clear `aria-label` values.
- Visible focus rings.

Avoid turning table rows into inaccessible click-only targets.

## 12. Help System Consideration

If the help system has been implemented, update help content and `data-help-id` targets to reflect the new interaction model:

- Book rows are clickable; no Action column.
- Measurement rows are clickable; no Action column.
- Customer scope cards are clickable.
- Meeting rows/scope cards are clickable.
- Wallboard cards are clickable only outside Display Mode.

## Acceptance Criteria

1. Critical Path Book no longer has an Action column.
2. Critical Path Book rows open the related project file when clicked.
3. Critical Path Book rows support keyboard activation.
4. Period filter includes Today, WTD, MTD, QTD, YTD, All, and Custom.
5. Custom period displays start and end date controls.
6. Custom period filtering works with start only, end only, both dates, and no dates.
7. Custom period state persists in localStorage.
8. Customer view work scope cards are clickable.
9. Clicking a customer work scope opens the project modal to Work Scopes and highlights the clicked scope.
10. Measurement Queue rows are clickable and no longer require an Action column.
11. Meeting rows and scope cards are clickable in intuitive ways.
12. Bottleneck alert clicks deep-link to the most relevant modal tab/scope.
13. TV Wallboard cards are clickable in normal mode but not emphasized in Display Mode.
14. All changed interactions remain keyboard accessible.
15. `npm run build` passes.
