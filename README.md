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
- [Modular Refactor Plan](project-docs/refactor-plan.md)
- [Help System Specification](project-docs/help-system-spec.md)

Phase 0 establishes the production baseline, gap checklist, behavior-preservation risks, and next implementation handoff before backend, authentication, role-based permissions, JobNimbus integration, or major UI changes are attempted.

Phase 1 stabilizes the existing prototype with isolated readability, navigation, and wallboard-separation styling in `src/phase-1-stabilization.css`. It intentionally avoids changing the data model, local storage, calculations, external integrations, or the active dashboard component structure.

## GitHub Pages

This repository supports two GitHub Pages publishing options:

- Preferred: `Settings` -> `Pages` -> `Source: GitHub Actions`
- Branch fallback: `Settings` -> `Pages` -> `Deploy from a branch`, then choose `main` and `/docs`

The `/docs` folder contains the compiled Vite build for branch-based Pages publishing.
