# MLB Dashboard

React/Vite dashboard for Major League Builders production, sales, Critical Path, and wallboard tracking.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Shared backend development

The shared backend uses Supabase/Postgres. Local mode remains the default until Supabase data and authentication are both explicitly enabled.

```bash
npm run supabase:start
npm run db:reset
npm run db:lint
npm run dev
```

See:

- [Supabase Backend Setup](supabase/README.md)
- [Authentication Operations](supabase/AUTHENTICATION.md)

## Local Phase 5 authentication test

After the local stack is running and migrations have been reset, create the local owner without copying a service-role key into a file:

```bash
LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='local-password-at-least-12-characters' \
LOCAL_OWNER_NAME='Local MLB Owner' \
npm run auth:bootstrap-local
```

Configure `.env.local` with the local API URL and publishable/anon key shown by `supabase status`, then set:

```txt
VITE_DATA_PROVIDER=supabase
VITE_AUTH_MODE=supabase
VITE_AUTH_REDIRECT_URL=http://127.0.0.1:5173
```

Never place the service-role key in a `VITE_` variable.

## Production Planning

Production-readiness and implementation documents are maintained in `project-docs/`.

- [Phase 0 Production Readiness Assessment](project-docs/phase-0-production-readiness-assessment.md)
- [Phase 1 Stabilization Implementation](project-docs/phase-1-stabilization.md)
- [Phase 2 Codebase Modernization Implementation](project-docs/phase-2-codebase-modernization.md)
- [Phase 3 Production Data Model](project-docs/phase-3-production-data-model.md)
- [Phase 3 Data Dictionary](project-docs/phase-3-data-dictionary.md)
- [Phase 3 Entity Relationships](project-docs/phase-3-entity-relationships.md)
- [Phase 3 Source-of-Truth Matrix](project-docs/phase-3-source-of-truth-matrix.md)
- [Phase 3 Implementation Checklist](project-docs/phase-3-implementation-checklist.md)
- [Phase 4 Shared Backend and Database](project-docs/phase-4-shared-backend.md)
- [Phase 4 Completion Status](project-docs/phase-4-completion-status.md)
- [Phase 5 Authentication, Users, and Roles](project-docs/phase-5-authentication-roles.md)
- [Phase 5 Role and Permission Matrix](project-docs/phase-5-role-permission-matrix.md)
- [Supabase Backend Operations](supabase/README.md)
- [Supabase Authentication Operations](supabase/AUTHENTICATION.md)
- [Modular Refactor Plan](project-docs/refactor-plan.md)
- [Help System Specification](project-docs/help-system-spec.md)

Phase 0 establishes the production baseline, gap checklist, behavior-preservation risks, and next implementation handoff.

Phase 1 stabilizes readability, navigation, and Wallboard separation without changing the data model or active component structure.

Phase 2 introduces the app wrapper, shared utilities, constants, reusable components, model references, and service boundaries.

Phase 3 defines the normalized production domain model, relationships, factories, validation, source ownership, financial calculations, IDs, legacy migration, and machine-readable schema.

Phase 4 adds the Supabase/Postgres schema, migrations, RLS, realtime repository, local fallback, compatibility bridge, guarded shared synchronization, backend administration, seed data, backup/restore, and backend CI.

Phase 5 adds invite-only authentication, login/logout, password recovery, active-profile enforcement, role and region permissions, salesperson assignment scope, owner safeguards, user administration, secure Edge Function invitations, Wallboard accounts, and local owner bootstrap. Because the legacy dashboard saves a complete nested dataset, full legacy write-back remains limited to Owner, Business Admin, and Operations Admin until granular role-specific editors are implemented.

## Production Data Model

The production dataset contract is versioned as `3.0.0` and documented in:

```txt
src/domain/
schemas/production-dataset.schema.json
```

## Authenticated administration

In Supabase mode, authorized accounts use the account control in the lower-right corner to open:

- Users, roles, and access.
- Backend administration.
- Password recovery.
- Profile controls.
- Sign-out.

The backend panel can also be opened directly by an authorized role with:

```txt
?backendAdmin=1
```

The user administration panel can be opened directly by an authorized role with:

```txt
?userAdmin=1
```

## GitHub Pages

This repository supports two GitHub Pages publishing options:

- Preferred: `Settings` → `Pages` → `Source: GitHub Actions`
- Branch fallback: `Settings` → `Pages` → `Deploy from a branch`, then choose `main` and `/docs`

The `/docs` folder contains the compiled Vite build for branch-based Pages publishing.
