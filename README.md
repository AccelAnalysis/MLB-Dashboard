# MLB Dashboard

React/Vite dashboard for Major League Builders production, sales, Critical Path, and wallboard tracking.

## Development

```bash
npm install
npm run dev
```

Local mode is the default and uses a development owner identity without requiring credentials. When the local normalized dataset is empty, Phase 6 performs a one-time conversion of the existing nested project cache so current records are immediately available in Critical Path Entry.

## Build and domain verification

```bash
npm run phase6:verify
npm run build
```

## Shared backend and authentication development

The production foundation uses Supabase/Postgres with invitation-only Supabase Auth.

```bash
npm run supabase:start
npm run db:reset
npm run db:lint

LOCAL_OWNER_EMAIL='owner@example.com' \
LOCAL_OWNER_PASSWORD='local-test-password-at-least-12-characters' \
LOCAL_OWNER_NAME='Local MLB Owner' \
npm run auth:bootstrap-local

npm run dev
```

See:

- [Supabase Backend Setup](supabase/README.md)
- [Authentication Operations](supabase/AUTHENTICATION.md)
- [First Owner Bootstrap](supabase/FIRST_OWNER.md)

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
- [Phase 5 Authentication, Users, and Roles](project-docs/phase-5-authentication-and-roles.md)
- [Phase 5 Role Matrix](project-docs/phase-5-role-matrix.md)
- [Phase 6 Manual Entry and Critical Path Replacement](project-docs/phase-6-manual-entry-critical-path.md)
- [Phase 6 Completion Status](project-docs/phase-6-completion-status.md)
- [Modular Refactor Plan](project-docs/refactor-plan.md)
- [Help System Specification](project-docs/help-system-spec.md)

## Implemented production phases

### Phase 0

Established the production-readiness baseline, gap checklist, behavior-preservation risks, and implementation handoff.

### Phase 1

Stabilized readability, navigation, and Wallboard separation without changing persistence or calculations.

### Phase 2

Added a clean app wrapper, utilities, constants, reusable components, and service boundaries around the large legacy component.

### Phase 3

Defined the normalized production model, entity relationships, validation, source ownership, financial calculations, record IDs, and legacy migration bridge.

### Phase 4

Added the Supabase/Postgres schema, migrations, RLS, realtime repository, local fallback, bidirectional legacy conversion, guarded synchronization, backend administration, seed data, backup/restore procedures, and backend CI.

### Phase 5

Added invitation-only authentication, sign-in/sign-out, password recovery, invitation activation, user lifecycle management, role administration, owner safeguards, browser authorization, role-scoped shared saves, account controls, and Wallboard-only access.

### Phase 6

Added the normalized Critical Path Entry workspace, new sold-job intake, customer and lead attribution, multi-scope production tracking, intake and permits, work-order specifications, financial/change-order closeout, role-aware section editing, validation, revision conflict protection, activity/status history, archive/void behavior, local normalized bootstrap, and immediate refresh of the existing Book, meeting, dashboard, and Wallboard views.

## Production Data Model

The production dataset contract is versioned as `3.0.0` and documented in:

```txt
src/domain/
schemas/production-dataset.schema.json
```

## Operational and administrative controls

Users access operational controls from the lower-right account/tools button.

Authorized roles may open:

- **Critical Path Entry**
- **Users, Roles, and Access**
- **Backend Administration**

Critical Path Entry is also addressable through:

```txt
?manualEntry=1
```

The backend panel is addressable through:

```txt
?backendAdmin=1
```

The user panel is addressable through:

```txt
?userAdmin=1
```

Query parameters do not bypass role checks.

## GitHub Pages

Preferred deployment:

```txt
Settings -> Pages -> Source: GitHub Actions
```

The deployment workflow accepts the browser-safe Supabase and authentication variables documented in `.env.example` and `supabase/AUTHENTICATION.md`.
