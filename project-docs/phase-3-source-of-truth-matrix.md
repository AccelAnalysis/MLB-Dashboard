# Phase 3 Source-of-Truth Matrix

## Principle

The MLB Dashboard must remain valuable even when JobNimbus data is unavailable, incomplete, delayed, or inconsistent. External systems may provide upstream records, but they must not overwrite dashboard-owned management truth.

## Matrix

| Data category | Primary authority | Fallback | Notes |
|---|---|---|---|
| Customer name | JobNimbus | Dashboard | Dashboard may correct incomplete imports |
| Customer phone/email | JobNimbus | Dashboard | Preserve manual corrections and source timestamps |
| Customer address | JobNimbus | Dashboard | County may come from spreadsheet enrichment |
| Job identity | JobNimbus when integrated | Dashboard | Always retain internal job ID |
| Original contract/estimate | JobNimbus | Historical spreadsheet | Subject to account-field validation |
| Salesperson assignment | JobNimbus when reliable | Dashboard | Dashboard owns corrections and reassignment history |
| Lead source | JobNimbus when reliable | Spreadsheet/dashboard | Must support lead-source scorecards |
| Work-scope structure | Dashboard | JobNimbus | Dashboard owns multi-scope operational model |
| Work-scope specifications | Dashboard | JobNimbus | Required for ordering and subcontractor direction |
| Production stage | Dashboard | JobNimbus | Dashboard is operational truth |
| Production dates | Dashboard | JobNimbus | Required for cycle-time calculations |
| Assigned measurer | Dashboard | JobNimbus | Preserve assignment history through events later |
| Assigned crew | Dashboard | JobNimbus | Crew identity should normalize to crew records |
| Material ETA | Dashboard | JobNimbus/vendor | Manual correction must be possible |
| Original contract amount | JobNimbus | Spreadsheet | Imported values require reconciliation |
| Change orders | Dashboard | Spreadsheet | Approved status determines financial effect |
| Final project amount | Dashboard | Spreadsheet | Must not be overwritten by original estimate |
| Deposit amount | Dashboard/JobNimbus | Spreadsheet | Reconcile before accounting integration |
| Amount paid | Accounting integration later | Dashboard | Dashboard is fallback until accounting source exists |
| Funding/collection status | Dashboard | Accounting | Operational visibility cannot wait for accounting integration |
| Cancellation date/reason | Dashboard | JobNimbus | Preserve salesperson/source attribution |
| Lead outcome | Dashboard | JobNimbus | Required for close and retention calculations |
| Status events | Dashboard | None | Append-only operational history |
| Activity logs | Dashboard | None | Security and accountability record |
| User roles/access | Dashboard auth system | None | Never imported from JobNimbus |
| Import history | Dashboard | None | Every import must be attributable |
| Calculated KPIs | Calculated from normalized records | None | Do not accept imported KPI totals as authority |

## Overwrite Rules

1. An incoming value from the authoritative source may update the field when the record is not locked or in conflict.
2. A fallback source may populate a missing field but should not replace a value already supplied by the authoritative source.
3. A dashboard-owned field must not be overwritten by JobNimbus during routine synchronization.
4. Manual corrections should retain who changed the field, why, and which prior source value was replaced.
5. Conflicting upstream values should set `syncState` to `conflict`, not silently win.
6. Imports should stage changes for preview before applying them to production records.
7. Calculated metrics must be recomputed from records rather than imported from summary spreadsheets.

## JobNimbus Integration Boundary

A one-way integration should generally follow:

```txt
JobNimbus customer/job/estimate data
              ↓
Staging and field mapping
              ↓
Normalized MLB customer/job/lead records
              ↓
Dashboard-owned scopes, production, final amounts, and audit history
```

Two-way synchronization should remain deferred until field ownership, conflict handling, and audit behavior are proven in production.

## Executable Rules

The field-level executable configuration is located in:

```txt
src/domain/sourceOfTruth.js
```

Future import and synchronization services should call `getFieldOwnership` and `canSourceOverwriteField` before applying changes.
