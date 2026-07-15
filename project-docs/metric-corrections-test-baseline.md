# Metric Corrections Test Baseline

## Purpose

This file records the protected working baseline established before MLB Dashboard metric-integrity corrections.

## Preserved state

- Source branch: `main`
- Baseline commit: `2318c40b52597c2ab976986271fa903dc2776181`
- Baseline snapshot branch: `baseline/pre-metric-corrections-2026-07-15`
- Working test branch: `test/metric-corrections`
- Baseline commit message: `Fix Open File modal text contrast`

The baseline snapshot branch must not receive feature or metric-correction commits. All metric correction work must occur on `test/metric-corrections` and reach `main` only through reviewed pull requests after automated verification and user acceptance testing.

## Workflow boundary

The sole project-entry and maintenance workflow remains:

```text
New Project -> Open File -> Edit Project -> Save Project File
```

Metric work must not introduce another customer, project, work-scope, Critical Path, or financial entry interface. Reporting, Book, Meeting, Bottleneck, Sales, and Wallboard views remain projections of the project file and normalized backend.

## Required verification before merge

```bash
npm ci --no-audit --no-fund
npm run backend:check
npm run phase6:verify
npm run build
```

Shared-backend verification should also run through the repository GitHub Actions workflow.
