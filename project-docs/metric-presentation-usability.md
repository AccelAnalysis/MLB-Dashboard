# Metric presentation and Customer usability pass

## Pre-change implementation audit

The stabilized dashboard keeps navigation, global region/period state, Project File editing, Production views, Sales, Bottlenecks, and Wallboard in `MLBDashboard_field_complete.jsx`. The Project File save path normalizes the saved project and remains the only project/customer entry workflow. Sales Activity remains a separate dated lead/opportunity input.

The smallest safe extraction points were:

- The duplicate inline Metric Card, replaced by the shared layout component.
- Production → Customer, extracted as a stateful workspace so search/filter state survives opening and closing a Project File.
- Metric presentation contracts and registry, kept outside presentation components and built from the validated project metric utilities.
- One shared chart, record table, and drilldown modal instead of metric-specific modal implementations.

The Book, Meeting, Bottlenecks, Project File, Wallboard, print rules, authentication, administration, and backend repository paths were not restructured.

## Corrected metric architecture

`src/utils/projectMetrics.js` remains the business-definition layer. It owns final project completion, category allocation, recognized revenue cohorts, sales-versus-production values, and completion-to-payment classification. `src/metrics/metricRegistry.js` adapts those validated results into presentation data: metric-specific supporting and excluded rows, contribution columns, monthly series, supported breakdowns, warnings, and comparison context. The correction verifier reconciles registry results back to the validated utilities.

Each result distinguishes `includedRecordCount`, `excludedRecordCount`, and `contextRecordCount`. A row's visible `metricContribution` is the amount, count, or days it contributes; ratio metrics label combined numerator and denominator rows as context instead of implying that every row is additive.

Sold-date and completion-date revenue cohorts are independent. Project-count and alert metrics do not inherit allocation failures. Exclusions are deduplicated by project ID and reason.

## Comparison definitions

Comparisons use real records in a preceding calendar range:

- Today: previous calendar day.
- WTD: the same number of elapsed days in the previous Monday-based week.
- MTD: the same elapsed calendar days in the previous month, clamped to month end.
- QTD: the same elapsed calendar days in the previous quarter, clamped to quarter end.
- YTD: January 1 through the equivalent date in the previous year.
- Custom: the immediately preceding inclusive range of equal length.
- All: unavailable because no bounded preceding range exists.

Results expose the comparison value, absolute change, percent change, and human-readable date label. A zero prior value produces an absolute change with no infinite percentage. A range with no real comparison records is shown as unavailable. Direction is metric-aware: higher, lower, or neutral as configured in the registry.

## Metric breakdowns

- Sales Revenue and Booked Value: salesperson, lead source, region, payment type, and allocated product category.
- Projects Sold: salesperson, lead source, region, and payment type. Product category is omitted to avoid non-additive multi-scope counts.
- Average Contract: salesperson, lead source, region, and payment type using revenue divided by project count per group.
- Leads Given: salesperson, lead source, region, and Sales Activity category.
- Close Rate and Value per Lead: salesperson, lead source, and region using group-specific numerators and denominators.
- Cancel Rate: salesperson, lead source, region, and payment type.
- Completed Value: salesperson, region, payment type, and allocated product category.
- Production/Sales: salesperson and region; its time chart groups booked and completed value and overlays the ratio.
- Backlog Movement: salesperson, region, and payment type.
- Completion-to-Payment: salesperson, region, payment type, and product category using true group averages.
- Open Alerts: alert type, salesperson, region, scope category, measurer, and crew. Alert Type is the default bar view; no historical alert trend is fabricated.

Single-scope revenue is assigned to its scope category. Balanced multi-scope revenue uses each saved scope allocation and combines duplicate scope categories. Incomplete or unbalanced allocations are excluded from a selected category result. For an unfiltered overall revenue result, project revenue remains recognized while the product-category breakdown omits unresolved projects and reports that limitation.

## Included and excluded classifications

- Sales Revenue / Booked Value: noncancelled projects in the sold-date period; selected-category allocation failures are excluded.
- Completed Value: noncancelled projects in the final-completion-date period; selected-category allocation failures are excluded.
- Projects Sold / Close Rate / Cancel Rate: project-count cohorts do not require revenue allocation.
- Completion-to-Payment included: collected or funded, a collection/funding date exists, and it is on or after final completion.
- Completion-to-Payment excluded: awaiting collection, marked collected/funded but missing its date, or collection/funding before completion. Counts and warnings are separate for all three reasons.
- Open Alerts: current validated alert instances only, with no revenue-allocation exclusion or warning.

## Workspace presentation

Salesperson and Lead Source are contextual Sales controls and apply to both Project Files and Sales Activity. Payment Type remains a sold-project breakdown and is not a lead-metric filter because Sales Activity has no equivalent field. Production Customer uses explicit Active Production, Production Completed, Awaiting Collection, and Cancelled labels; Awaiting Collection is documented as a subset of Production Completed. The single visible New Project action lives in Production Customer and still invokes the existing Project File workflow.

## Remaining limitations

- Open Alerts has no historical comparison or time trend because the application does not store alert snapshots.
- Product-category averages for multi-category payment projects are non-additive: a measured project can inform more than one category average.
- Comparison ranges are calendar-based and do not account for business-day or holiday calendars.
- Recharts remains in the main application bundle; route-level code splitting is a future performance option.
- The navigation shell and left-drawer concept remain a later UI pass.
