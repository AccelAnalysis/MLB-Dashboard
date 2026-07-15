# Phase 5 Role and Permission Matrix

## Principles

1. Database RLS remains the authoritative security boundary.
2. Browser permissions prevent misleading or unauthorized local edits before a database call occurs.
3. Historical attribution is preserved by deactivating users rather than deleting them.
4. User login identity and operational team-member identity remain separate records.
5. The current nested legacy interface permits category-scoped edits; more precise record ownership can be added after normalized screens replace the legacy component.

## Matrix

| Capability | Owner | Business Admin | Operations Admin | Sales Manager | Salesperson | Production Manager | Viewer | Wallboard | Developer Support |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Operator dashboard | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes |
| TV Wallboard | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Invite/manage users | Yes | Yes | No | No | No | No | No | No | No |
| Assign owner role | Yes | No | No | No | No | No | No | No | No |
| Backend administration | Yes | Yes | No | No | No | No | No | No | No |
| Create/remove whole projects in legacy UI | Yes | Yes | Yes | No | No | No | No | No | No |
| Customer and sales fields | Yes | Yes | Yes | Yes | No | No | No | No | No |
| Production and work-scope fields | Yes | Yes | Yes | No | No | Yes | No | No | No |
| Financial, cancellation, and change-order fields | Yes | Yes | Yes | No | No | No | No | No | No |
| Backup import/export | Yes | Yes | No | No | No | No | No | No | No |
| Reset local/demo data | Yes | No | No | No | No | No | No | No | No |
| Change own display name | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Password recovery/sign out | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

## Role Definitions

### Owner

The owner has full business and security authority.

Only the owner may:

- Assign another owner.
- Demote or deactivate an owner, subject to last-owner protection.
- Reset local/demo data.

The last active owner cannot be demoted or deactivated.

### Business Administrator

The business administrator manages:

- Users other than owner-role assignment.
- Backend administration.
- Sales, production, and financial data.
- Project creation.
- Backup import/export.

A business administrator cannot assign or remove the owner role and cannot reset local/demo data.

### Operations Administrator

The operations administrator manages daily business operations:

- Project creation.
- Sales/customer data.
- Production data.
- Financial and cancellation data.

The role does not manage users, backend configuration, or backup import/export.

### Sales Manager

The sales manager manages:

- Customer identity fields represented in the current dashboard.
- Sold date.
- Salesperson assignment.
- Lead source.
- Sales-related location/region fields.

The role cannot change:

- Work scopes or production dates.
- Financial values.
- Change orders.
- Cancellation or collection status.
- User or backend settings.

### Salesperson

The current legacy UI provides read access for salespeople.

Ownership-scoped lead/job editing is deferred until normalized customer, lead, and job screens replace the nested legacy project record. This avoids granting a salesperson the ability to overwrite other salespeople's records through a full-dataset save.

### Production Manager

The production manager manages:

- Intake and permit tracking.
- Work scopes.
- Measurement fields.
- Materials and vendor fields.
- Scheduling and crew fields.
- Completion dates.
- Production notes and decisions.

The role cannot change customer/sales attribution, financial values, change orders, cancellation status, users, or backend settings.

### Viewer

Viewer is read-only across the operator dashboard and Wallboard.

### Wallboard

Wallboard is a display-only role. It is automatically routed to the full-screen TV Wallboard and cannot enter the operator dashboard.

### Developer Support

Developer Support is read-only. It can review the dashboard for troubleshooting but receives no business-data, user-management, or backend-administration write authority.

## Region Access

Phase 5 stores region access on each user profile and exposes it to the application context.

Current database policies permit active users to read operational data broadly. Full database-level region filtering is deferred until normalized screens and repository queries use profile region scope consistently. The profile field and administration controls are implemented now so later row filtering does not require another user-model migration.

Until database-level regional filtering is activated, region access is an assigned entitlement and UI context rather than a complete row-security partition.

## Legacy Interface Limitation

The active dashboard still saves nested project objects. Browser authorization therefore classifies changes by field category rather than by normalized entity action.

The normalized database and RLS support more precise policies, but the application cannot fully exploit them until customer, lead, job, work-scope, and financial forms are separated from the large legacy component.

Phase 5 closes the immediate security gap while preserving the established dashboard behavior.
