# Repository guide for agents and contributors

**Owner:** Ersan Jahed Tabrizi — see `docs/AUTHOR.md`

## Start here (navigation)

Before editing any file, read **`docs/CODEBASE-MAP.md`** — it maps every feature to the exact source path (dashboard chunks, routes, services, gateway, CSS).

## Scope

Monorepo: **Node backend** (`backend/`), **WhatsApp gateway** (`gateway/`), **Vite dashboard** (`frontend/` → ships into `backend/public/js/app/`), **Android** (`android-app/` — see README), **iOS** (`ios-app/`), **docs** (`docs/`).

**Docs:** [PRODUCT-MARKETING-FA.md](docs/PRODUCT-MARKETING-FA.md) (sales) · [FOLDER-MAP-FA.md](docs/FOLDER-MAP-FA.md) (structure)

**Branding:** Staff web and Android client read organization title and login visuals from **`GET /api/panel-settings/public/branding`** (configured in the dashboard under **Panel appearance** / `#panel-settings`). Do not hardcode a single customer trade name in user-visible strings when a dynamic value exists.

## Authoritative standards

Read **`docs/PROJECT-STANDARDS.md`** (Persian) and **`docs/CODEBASE-MAP.md`** (navigation) for:

- Directory layout and layer responsibilities
- Commands: `npm run quality`, lint/format/test, Android Gradle targets
- Security and CI expectations

## Quick commands (repo root)

```bash
npm run quality      # lint (backend+gateway) + backend tests + Vite production build
npm run lint         # ESLint backend + gateway
npm run test         # backend suite
npm run test:all     # backend --prefix (suite + integration)
```

Android (requires JDK 17+, Android SDK for full CI parity):

```bash
cd android-app && ./gradlew lintDebug assembleDebug
```

## Engineering rules for changes

- Prefer **small, reviewable PRs**; match existing naming and module boundaries.
- Do not commit **secrets** or generated **`.env`** files.
- After substantive edits: run **`npm run quality`**; for Android UI/network code run **`lintDebug`**.
- Default text direction for the staff product is **RTL (fa)**; keep UI consistent with existing Compose/Material patterns.

## Editor normalization

Root **`.editorconfig`** defines charset, LF, indentation. Keep new files compliant.
