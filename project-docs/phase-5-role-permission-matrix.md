# Phase 5 Role and Permission Matrix

## Role definitions

| Role | Intended use |
|---|---|
| Owner | Final business authority, owner protection, user administration, and full operational control. |
| Business Admin | Daily business administration, user administration, and full dashboard operations except protected owner actions. |
| Operations Admin | Full operational dashboard control without user administration. |
| Sales Manager | Sales oversight and sales-domain permissions; read-only in the current full-dataset legacy UI. |
| Salesperson | Review of assigned leads, customers, and jobs through linked team-member identity. |
| Production Manager | Production-domain permissions; read-only in the current full-dataset legacy UI. |
| Viewer | Region-filtered read-only access. |
| Wallboard | Region-filtered Wallboard-only display account. |
| Developer Support | Read-only troubleshooting and backend-status access without business-data write authority. |

## Application capabilities

| Capability | Owner | Business Admin | Operations Admin | Sales Manager | Salesperson | Production Manager | Viewer | Wallboard | Developer Support |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Sign in | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| View operator dashboard | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No | Yes |
| View Wallboard | Yes | Yes | Yes | Yes | No | Yes | Yes | Yes | Yes |
| Manage users | Yes | Yes | No | No | No | No | No | No | No |
| Invite owner | Yes | No | No | No | No | No | No | No | No |
| Manage business data | Yes | Yes | Yes | No | No | No | No | No | No |
| Manage sales domain in database | Yes | Yes | Yes | Yes | No | No | No | No | No |
| Manage production domain in database | Yes | Yes | Yes | No | No | Yes | No | No | No |
| Full legacy dashboard write-back | Yes | Yes | Yes | No | No | No | No | No | No |
| Backend administration panel | Yes | Yes | Yes | No | No | No | No | No | Yes |
| Read-only notice in legacy UI | No | No | No | Yes | Yes | Yes | Yes | N/A | Yes |
| Forced Wallboard display | No | No | No | No | No | No | No | Yes | No |

## Data visibility

| Record area | Owner / Business Admin / Operations Admin | Sales Manager | Salesperson | Production Manager | Viewer / Wallboard | Developer Support |
|---|---|---|---|---|---|---|
| Jobs | All | Approved regions | Assigned salesperson jobs only | Approved regions | Approved regions | All for troubleshooting |
| Work scopes | Related accessible jobs | Related accessible jobs | Related assigned jobs | Related accessible jobs | Related accessible jobs | Related accessible jobs |
| Change orders | Related accessible jobs | Related accessible jobs | Related assigned jobs | Related accessible jobs | Related accessible jobs | Related accessible jobs |
| Leads | All where management role permits | Sales-management scope | Assigned leads and related assigned jobs | Related accessible jobs | Related accessible jobs | Related accessible records |
| Customers | All where management role permits | Sales-management scope | Assigned leads/jobs | Related accessible jobs | Related accessible jobs | Related accessible records |
| User profiles | All for user administrators | Own profile | Own profile | Own profile | Own profile | Own profile |

## Team-member linkage

The user profile and team-member record are intentionally separate:

- A team member represents a salesperson, employee, contractor, measurer, or production staff identity used in operational history.
- A user profile represents an authenticated dashboard account.
- A historical salesperson may exist without an active login.
- A login may be linked to the appropriate team member so RLS can limit salesperson access to assigned records.

## Region access

Region access is stored on the user profile as an array.

Current recognized operational regions:

- Virginia
- Carolina

Owner, Business Admin, Operations Admin, and Developer Support roles have administrative visibility that is not restricted by the region array. Other applicable roles are constrained to approved regions, except salespeople, who are further constrained to their assigned records.

## Legacy-interface restriction

The legacy React dashboard writes one complete nested dataset. It cannot yet safely save only the fields allowed to a Sales Manager or Production Manager.

Therefore:

- Database permissions define the future granular domain authority.
- The current legacy UI remains read-only for specialized roles.
- Owner, Business Admin, and Operations Admin are the only roles allowed to perform full legacy write-back.

This restriction should be revisited as the large dashboard component is decomposed into entity-specific repositories and editors.

## Owner safeguards

Database triggers enforce:

- Only an owner can assign the owner role.
- Only an owner can modify another owner.
- Only an owner can relink an owner's authentication account.
- The final active owner cannot be demoted.
- The final active owner cannot be deactivated.
- The final active owner cannot be deleted.

These rules do not rely on the browser UI.
