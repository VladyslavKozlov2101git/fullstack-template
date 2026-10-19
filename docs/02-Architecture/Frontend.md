---
type: architecture
apps:
  - web
tags:
  - architecture
  - frontend
---

# Frontend — apps/web

React 19 + Vite. Structure ported from a proven in-house template; data flows one way and each layer
has exactly one job.

## Layers

| Layer            | File                        | Job                                                                            |
| ---------------- | --------------------------- | ------------------------------------------------------------------------------ |
| generated client | `@repo/api-client`          | types plus a `createApiClient` factory, nothing else                           |
| app client       | `src/services/api.ts`       | the single instance, plus auth header / 401 redirect / 5xx toast middleware    |
| server state     | `src/services/cachedAPI.ts` | RTK Query caching and hooks; endpoints call the typed client through `queryFn` |
| client state     | `src/redux/*Slice`          | `createSlice` for state the server does not own (`SessionSlice`)               |
| pages            | `src/pages/*`               | rendering and local UI state only                                              |

`cachedAPI` uses `fakeBaseQuery()` deliberately: endpoints call the typed client directly, so
request and response types come from the OpenAPI spec instead of being re-declared in the cache
layer.

Import `api` from `@services/api`, never `createApiClient` from the package — a second client misses
the middleware.

## Folders

`app/` (store, typed redux hooks, `App.tsx`) · `assets/` (icons, global SCSS) · `components/` (dumb
presentational) · `containers/` (auth-gated layout shells) · `helpers/` · `layouts/` (Header,
Footer) · `models/` (types derived from the contract) · `pages/` (one folder per route) · `redux/` ·
`routes/` · `services/` · `shared/` (UI primitives) · `tests/`.

Every component is a folder of three files — `Name.tsx`, `Name.module.scss`, `index.ts` — generated
with `pnpm plop`. Path aliases (`@app`, `@shared`, `@services`, …) are declared in **both**
`vite.config.ts` and `tsconfig.json`; add to both or the build and the editor disagree.

Details and the full rule list: `apps/web/CLAUDE.md`.

## Features touching this app

None yet. Feature pages carry `apps: [web]` and are linked from here.
