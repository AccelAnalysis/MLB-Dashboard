# Phase 3 Entity Relationships

## Relationship Overview

```txt
Customer
  ├──< Lead
  └──< Job
         ├──< Work Scope
         ├──< Change Order
         └──< Status Event / Activity Log

Team Member
  ├──< Lead.assignedSalespersonId
  ├──< Job.salespersonId
  └──< User Profile.teamMemberId

Crew
  └──< Work Scope.crewId

User Profile
  ├──< Status Event.actorUserId
  ├──< Activity Log.actorUserId
  └──< Import Run.initiatedBy
```

## Cardinality Rules

### Customer to Lead

- One customer may have zero or many leads.
- Every lead must reference one customer.
- Multiple inquiries from the same customer should remain separate leads for accurate lead-source and conversion reporting.

### Customer to Job

- One customer may have zero or many jobs.
- Every job must reference one customer.
- A repeat customer should not be recreated solely because a new contract is sold.

### Lead to Job

- One lead may produce zero or one primary sold job in the initial production design.
- A job may reference zero or one lead when historical source data is incomplete.
- If MLB later supports one lead producing multiple contracts, that relationship should become a junction table rather than overloading `job.leadId`.

### Job to Work Scope

- One job may have one or many work scopes.
- Every work scope must reference one job.
- Each scope independently owns its production dates, specifications, vendor, measurer, crew, status, and completion state.
- A job with no scope may temporarily exist during intake but should be flagged before production scheduling.

### Job to Change Order

- One job may have zero or many change orders.
- Every change order must reference one job.
- A change order may optionally reference one work scope.
- Job-level change orders apply across scopes or to overall contract conditions.

### Job/Scope/Lead to Status Event

- Any workflow entity may have many status events.
- Status events should be append-only after creation, except for tightly controlled administrative corrections.
- The current entity status should be consistent with the most recent valid status event once event-driven workflows are activated.

### Any Entity to Activity Log

- Any business entity may have many activity logs.
- Activity logs should not be deleted with the business entity.
- Archived or cancelled records must retain their activity history.

### Team Member to Sales Records

- One team member may be assigned to many leads and jobs.
- Historical attribution remains even if the team member becomes inactive.
- A team member is not required to have a user login.

### Team Member to User Profile

- One team member may have zero or one current platform user profile in the initial design.
- A wallboard user does not require a team-member relationship.
- Developer/support users do not require a team-member relationship.

### Crew to Work Scope

- One crew may be assigned to many work scopes over time.
- One work scope has zero or one primary assigned crew in the initial design.
- If multiple simultaneous crews are required later, use a scope-assignment junction entity with assignment dates and responsibility type.

### User to Import Run

- One user may initiate many import runs.
- Every production import should retain an initiating user or system identity.

## Referential Integrity Rules

1. A job cannot be production-active without a valid customer.
2. A work scope cannot exist without a valid job.
3. A change order cannot exist without a valid job.
4. A referenced optional work scope on a change order must belong to the same job.
5. A salesperson ID must reference a team member eligible for sales attribution.
6. A crew ID must reference an active or historical crew record.
7. Historical records may reference inactive team members and crews.
8. A user profile linked to a team member must not silently change historical sales attribution.
9. Deactivating a user must not delete the related team member.
10. Archiving a customer must not orphan active jobs.

## Lifecycle Rules

### Customer

- Customers are normally archived, not deleted.
- A customer with jobs, leads, financial history, or communications should not be permanently deleted through standard UI workflows.

### Lead

- Lead statuses progress from new/assigned through sold, lost, or cancelled.
- Lost and cancelled leads remain reportable.

### Job

- Jobs may be active, completed, closed, cancelled, or archived.
- `completed` means production work is complete.
- `closed` means production and financial/administrative closeout are complete.
- Cancellation should preserve original contract, salesperson, source, and reason.

### Work Scope

- Work-scope lifecycle is independent within the parent job.
- Completing one scope must not close the job while other scopes remain incomplete.

### Change Order

- Draft and pending change orders should not increase final approved contract value.
- Approved change orders affect revised/final calculations.
- Rejected and void change orders remain in history.

### User

- Users are invited, active, or inactive.
- Inactivation removes access but preserves historical actions.

## Multi-Location and Region Rules

- Region is stored at the job level because a customer may have jobs in different service areas.
- User access may be restricted through `regionAccess`.
- Team members may have `regionAssignments` for operational routing.
- Region labels should eventually be configuration records rather than hard-coded UI constants.

## Future Junction Entities

The following are deliberately deferred until required:

- Customer address history.
- Multiple contacts per customer.
- Multiple salespeople per job.
- Multiple crews per scope.
- Scope crew-assignment history.
- Commission allocations.
- Document attachments.
- Customer communications.
- Vendor and material-order line items.
- Product/price-book records.

These should be added as normalized entities rather than embedded arrays when their production workflows are implemented.
