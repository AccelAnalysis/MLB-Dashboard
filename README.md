# MLB Dashboard

React/Vite preview dashboard for Major League Builders production tracking.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Production Planning

Production-readiness and implementation planning documents are maintained in `project-docs/`.

- [Phase 0 Production Readiness Assessment](project-docs/phase-0-production-readiness-assessment.md)
- [Phase 1 Stabilization Implementation](project-docs/phase-1-stabilization.md)
- [Phase 2 Codebase Modernization Implementation](project-docs/phase-2-codebase-modernization.md)
- [Phase 3 Production Data Model](project-docs/phase-3-production-data-model.md)
- [Phase 3 Data Dictionary](project-docs/phase-3-data-dictionary.md)
- [Phase 3 Entity Relationships](project-docs/phase-3-entity-relationships.md)
- [Phase 3 Source-of-Truth Matrix](project-docs/phase-3-source-of-truth-matrix.md)
- [Phase 3 Implementation Checklist](project-docs/phase-3-implementation-checklist.md)
- [Modular Refactor Plan](project-docs/refactor-plan.md)
- [Help System Specification](project-docs/help-system-spec.md)

Phase 0 establishes the production baseline, gap checklist, behavior-preservation risks, and next implementation handoff before backend, authentication, role-based permissions, JobNimbus integration, or major UI changes are attempted.

Phase 1 stabilizes the existing prototype with isolated readability, navigation, and wallboard-separation styling in `src/phase-1-stabilization.css`. It intentionally avoids changing the data model, local storage, calculations, external integrations, or the active dashboard component structure.

Phase 2 introduces a clean app entry wrapper, shared utility modules, data constants, reusable layout components, JSDoc model references, and service-layer boundaries. It keeps the stabilized dashboard behavior intact while preparing the large active dashboard file for incremental extraction.

Phase 3 defines the normalized production domain model under `src/domain/`, including entities, relationships, factories, validation, source-of-truth rules, financial calculations, record IDs, legacy migration, and a machine-readable schema. The active prototype remains on its legacy nested records until a shared-backend migration is approved.

## Production Data Model

The production dataset contract is versioned as `3.0.0` and documented in:

```txt
src/domain/
schemas/production-dataset.schema.json
```

## GitHub Pages

This repository supports two GitHub Pages publishing options:

- Preferred: `Settings` -> `Pages` -> `Source: GitHub Actions`
- Branch fallback: `Settings` -> `Pages` -> `Deploy from a branch`, then choose `main` and `/docs`

The `/docs` folder contains the compiled Vite build for branch-based Pages publishing.
