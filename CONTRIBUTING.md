# Contributing — Kaya CRM

## Before opening a PR

1. From repo root:
   - `npm run lint`
   - `npm test`
2. Optionally: `npm run format:write` (backend + gateway).

## Code style

- **EditorConfig** (`.editorconfig`) — UTF-8, LF, 4 spaces for JS.
- **Prettier** — root `.prettierrc` matches `backend/` and `gateway/`.
- **ESLint** — `backend/.eslintrc.cjs`, `gateway/.eslintrc.cjs`.

## Dashboard frontend

Large SPA lives in `backend/public/js/dashboard.js`. New UI strings go to `i18n-fa.js`, `i18n-en.js`, `i18n-tr.js` (not duplicated inside dashboard). See `backend/docs/FRONTEND-ARCHITECTURE.md` and `docs/DASHBOARD-REFACTOR.md`.

## Commits

Short, imperative messages (e.g. `fix: ticket badge count`). Farsi/English both OK.
