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
- [Modular Refactor Plan](project-docs/refactor-plan.md)
- [Help System Specification](project-docs/help-system-spec.md)

Phase 0 is documentation and assessment only. It establishes the production baseline, gap checklist, behavior-preservation risks, and next implementation handoff before backend, authentication, role-based permissions, JobNimbus integration, or major UI changes are attempted.

## GitHub Pages

This repository supports two GitHub Pages publishing options:

- Preferred: `Settings` -> `Pages` -> `Source: GitHub Actions`
- Branch fallback: `Settings` -> `Pages` -> `Deploy from a branch`, then choose `main` and `/docs`

The `/docs` folder contains the compiled Vite build for branch-based Pages publishing.
