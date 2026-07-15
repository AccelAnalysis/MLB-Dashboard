# Layout Components

Phase 2 introduces reusable layout components that mirror stable pieces of the existing dashboard. These components are intentionally small and behavior-compatible with the current prototype so future refactor passes can replace inline definitions safely.

Current reusable components:

- `Badge.jsx`
- `MetricCard.jsx`
- `WhiteboardStatusKey.jsx`

Do not redesign these while extracting them into active views. The first refactor goal is parity, not improvement.
