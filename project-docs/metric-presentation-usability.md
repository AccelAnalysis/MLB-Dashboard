# Metric presentation and Customer usability pass

## Pre-change implementation audit

The stabilized dashboard keeps navigation, global region/period state, Project File editing, Production views, Sales, Bottlenecks, and Wallboard in `MLBDashboard_field_complete.jsx`. The Project File save path normalizes the saved project and remains the only project/customer entry workflow. Sales Activity remains a separate dated lead/opportunity input.

The smallest safe extraction points were:

- The duplicate inline Metric Card, replaced by the shared layout component.
- Production → Customer, extracted as a stateful workspace so search/filter state survives opening and closing a Project File.
- Metric presentation contracts and registry, kept outside presentation components and built from the validated project metric utilities.
- One shared chart, record table, and drilldown modal instead of metric-specific modal implementations.

The Book, Meeting, Bottlenecks, Project File, Wallboard, print rules, authentication, administration, and backend repository paths were not restructured.

## Metric and filter contracts

`src/metrics/metricRegistry.js` exposes stable metric IDs and returns metric result objects with labels, descriptions, formulas, formats, date bases, values, record counts, real-data time series, supported breakdowns, supporting records, excluded records, and warnings. It delegates revised revenue, category allocation, final completion date, alerts, and project status behavior to the existing validated utilities.

Workspace filters use period, custom dates, region, product category, salesperson, lead source, payment type, and status keys. Drilldowns inherit those values and maintain period overrides locally until closed.

## Scope intentionally deferred

- Comparison-period calculation remains represented in the contract but is not populated until a validated comparison-period rule is approved.
- Salesperson, lead-source, payment-type, and status controls are contract-ready but remain contextual rather than being added to the global header.
- The navigation shell and left-drawer concept remain a later UI pass.
- Recharts is currently part of the main application bundle; route-level code splitting can be considered in a later performance pass.
