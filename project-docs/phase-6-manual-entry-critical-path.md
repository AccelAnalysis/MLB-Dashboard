# Phase 6 Manual Entry and Critical Path Replacement

## Purpose

Phase 6 establishes the production-oriented manual workflow that Major League Builders can use before JobNimbus or accounting integrations are complete.

The implementation is manual-first and integration-ready. It provides a dedicated normalized entry workspace while preserving the existing operator dashboard, Critical Path Book, weekly meeting view, bottleneck views, sales views, and TV Wallboard.

## Operational outcome

Authorized users can now:

1. Create a sold job with a linked customer and lead record.
2. Maintain customer contact and location details.
3. Attribute the job and lead to a salesperson.
4. Record lead source and campaign information.
5. Create one or more work-scope Critical Path records.
6. Maintain measure, ordering, material, scheduling, start, and completion dates.
7. Assign measurers, crews, vendors, priorities, specifications, and notes.
8. Record intake and permit progress.
9. Record original contract, approved changes, final amount, payments, funding, collection, cancellation, and closeout.
10. Preserve status history and activity attribution.
11. Refresh the current Book, meeting, operator, and Wallboard views immediately after save.

## Access

Open the account and operational controls in the lower-right corner and choose:

```txt
Critical Path Entry
```

Authorized users can also open the workspace with:

```txt
?manualEntry=1
```

The workspace is not added as another top-level dashboard view. This preserves the existing operator navigation and prevents the duplicate-view problems experienced in earlier design iterations.

## Workspace layout

### Record list

The left side provides:

- Search by customer, city, region, scope, sold date, or production stage.
- Existing sold-job selection.
- Stage and scope-count indicators.
- Decision-needed visibility.
- A New Sold Job action for roles with project-creation authority.

### Customer and Sale

The customer and sales section supports:

- Customer or company name.
- First and last name.
- Phone, alternate phone, and email.
- Preferred contact method.
- Street, city, county, state, and postal code.
- Customer notes.
- Date sold.
- Operating region.
- Job city or location.
- Salesperson.
- Lead source.
- Campaign.
- Lead received date.
- Lead status and notes.

### Production and Scopes

The production section supports:

- Job production stage.
- Decision needed.
- Contract received.
- Documents uploaded.
- Estimate approved.
- Budget created.
- Invoice created.
- File created.
- Permit requirement, type, submission, approval, and notes.
- Job-level production notes.

Each work scope supports:

- Product category.
- Scope stage.
- Priority.
- Description.
- Measurer.
- Crew or subcontractor.
- Vendor.
- Measure requested.
- Measured.
- Material list received.
- Materials ordered.
- Material ETA.
- Materials received.
- Scheduled install.
- Started.
- Completed.
- Work-order specifications.
- Scope notes.

Existing scopes are archived instead of deleted. Archived scopes remain available for normalized history and audit use but are excluded from active Book and Wallboard projections.

### Financials and Closeout

The financial section supports:

- Original contract amount.
- Approved change-order total.
- Revised contract amount.
- Final amount override.
- Deposit amount.
- Amount paid.
- Balance due.
- Payment type.
- Financing provider.
- Payment status.
- Funded, collected, and closed dates.
- Thank-you status.
- Cancellation date and reason.

Change orders support:

- Requested and approved dates.
- Draft, pending, approved, rejected, and void states.
- Amount.
- Description and reason.
- Related work scope.
- Customer approval.

Change orders are voided rather than deleted so the financial history remains explainable.

## Validation

The browser validation blocks save when:

- Customer or company name is missing.
- Date sold is missing.
- Region is invalid.
- Original amount is negative.
- No active work scope remains.
- A scope lacks a category.
- Critical Path dates are chronologically impossible.
- A change order lacks a description.
- Permit approval precedes submission.
- A cancelled job lacks a cancellation date or reason.
- The user lacks project-creation authority for a new sold job.

Warnings are shown when:

- Customer contact information is incomplete.
- Salesperson is unassigned.
- Lead source is blank.
- Permit type is missing for a required permit.
- An approved change order lacks an approval date.
- Amount paid exceeds the effective final amount.

The database adds future-write constraints for nonnegative job amounts, complete cancellation details, and active scope categories.

## Permission behavior

### Owner, Business Administrator, and Operations Administrator

These roles can create complete sold-job records and maintain sales, production, and financial sections.

### Sales Manager

Can maintain customer, lead, salesperson, region, sold-date, and sales-attribution information. Production and financial sections are read-only.

### Production Manager

Can maintain job stages, intake, permits, decisions, production notes, work scopes, assignments, specifications, and Critical Path dates. Sales and financial sections are read-only.

### Salesperson, Viewer, Wallboard, and Developer Support

These roles do not receive Phase 6 edit access in the current interface.

The service rechecks permissions during save. Disabled fields alone are not treated as a security boundary.

## Concurrency protection

Every normalized record has a revision number. Before updating a job, customer, lead, scope, or change order, Phase 6 compares the form revision with the latest repository revision.

When another user has changed the record after the form opened, save is rejected and the user is instructed to refresh. This prevents silent overwriting of another user's work.

## Activity and status history

Phase 6 creates:

- Job status events when the production stage changes.
- Payment status events when payment state changes.
- Scope status events when a scope stage changes.
- Activity logs for new and updated Critical Path records.
- Before and after record summaries.
- Actor user IDs and timestamps.

Status and activity collections are append-only. Existing history rows are not updated during later saves.

## Normalized and legacy compatibility

The Phase 6 workspace writes the Phase 3 normalized dataset:

```txt
customers
leads
jobs
workScopes
changeOrders
statusEvents
activityLogs
```

After a successful save, the normalized dataset is projected into the stabilized nested project format used by:

- Operator view.
- Customer production view.
- Critical Path Book.
- Weekly Critical Path meeting.
- Bottleneck views.
- Sales summaries.
- TV Wallboard.

This bridge allows MLB to use the new authoritative entry path without waiting for a complete replacement of every existing view.

## Local development behavior

When the local normalized dataset is empty, the local repository performs a one-time conversion of the existing legacy project cache. This makes current demo or local test records immediately available in Critical Path Entry.

Subsequent Phase 6 saves update both:

- The normalized local production dataset.
- The nested compatibility cache used by the existing dashboard.

## Database additions

Migration:

```txt
supabase/migrations/20260715000900_phase6_manual_critical_path.sql
```

Adds:

- Nonnegative job-amount constraint for new and updated records.
- Complete-cancellation constraint for new and updated records.
- Active-scope category constraint.
- `v_manual_entry_readiness`.
- `get_manual_entry_status()`.
- Phase 6 application metadata.

The readiness view identifies:

- Jobs without active scopes.
- Jobs without assigned salespeople.
- Missing lead sources.
- Customers without contact paths.
- Incomplete cancellation details.
- Invalid scope date sequences.

## Automated validation

Run:

```bash
npm run phase6:verify
```

The command validates:

- Required manual-entry fields.
- Critical Path chronology.
- Approved change-order calculations.
- Specification parsing.
- Normalized job summaries.
- Archived-scope exclusion from active legacy projections.

The backend CI workflow runs this command before the application build and Supabase migration tests.

## Non-goals

Phase 6 does not:

- Implement JobNimbus synchronization.
- Implement accounting synchronization.
- Replace every legacy display component.
- Add permanent record deletion.
- Add salesperson ownership-scoped editing.
- Enable region-based database row filtering.
- Finalize bottleneck thresholds or production-capacity formulas.
- Implement bulk CSV import.

Those areas remain assigned to later phases.
