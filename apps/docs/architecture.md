# Architecture

```
apps/web  ──uses──▶  @repo/api-client  ──generated from──▶  apps/api OpenAPI spec
                                                                   │
                                                            Prisma ▼
                                                               Postgres
```

- **apps/api** — NestJS. Owns the database schema (Prisma) and the HTTP contract. Routes live under
  `/api`; the OpenAPI spec is served at `/api/docs-json`.
- **packages/api-client** — `openapi-typescript` turns that spec into types, `openapi-fetch` into a
  typed client. Generated, committed, never hand-edited.
- **apps/web** — React + Vite. Talks to the API only through the generated client. Dev requests to
  `/api` are proxied to port 3000, so there is no CORS setup.
- **apps/docs** — this site (VitePress).
- **specs/** — spec-driven-development artifacts, one folder per feature.

## Changing the contract

1. Edit `apps/api/prisma/schema.prisma` → `pnpm db:migrate`.
2. Update the controller and its DTOs (`@ApiOkResponse` on responses, `class-validator` on inputs —
   without them the spec says `any` and the client loses its types).
3. With the API running: `pnpm api:generate`.
4. `pnpm typecheck` — the web app now fails loudly wherever the contract broke.

## Frontend layers

Data flows one way, and each layer has exactly one job:

| Layer            | File                            | Job                                                                         |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------- |
| generated client | `@repo/api-client`              | types + `createApiClient` factory, nothing else                             |
| app client       | `web/src/services/api.ts`       | the single instance, plus auth header / 401 redirect / 5xx toast middleware |
| server state     | `web/src/services/cachedAPI.ts` | RTK Query caching and hooks; endpoints call the typed client via `queryFn`  |
| client state     | `web/src/redux/*Slice`          | `createSlice` for state the server doesn't own                              |
| pages            | `web/src/pages/*`               | rendering and local UI state only                                           |

`cachedAPI` deliberately uses `fakeBaseQuery()`: endpoints call the typed client directly, so types
come from the OpenAPI spec instead of being re-declared in the cache layer.

## Frontend folders

See `apps/web/CLAUDE.md` in the repo for the full table. In short: `app/` (store + App),
`containers/` (auth-gated layout shells), `layouts/` (Header, Footer), `pages/` (one folder per
route), `shared/` (UI primitives), `components/` (dumb presentational), `helpers/`, `models/` (types
derived from the spec), `routes/`, `services/`, `assets/`.

Every component is a folder of three files — `Name.tsx`, `Name.module.scss`, `index.ts` — generated
with `pnpm plop`.
