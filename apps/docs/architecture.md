# Architecture

```
apps/web  ──uses──▶  packages/api-client  ──generated from──▶  apps/api OpenAPI spec
                                                                      │
                                                               Prisma ▼
                                                                  Postgres
```

- **apps/api** — NestJS. Owns the database schema (Prisma) and the HTTP contract. Routes live under `/api`; the OpenAPI spec is served at `/api/docs-json`.
- **packages/api-client** — `openapi-typescript` turns that spec into types, `openapi-fetch` into a typed client. Generated, committed, never hand-edited.
- **apps/web** — React + Vite. Talks to the API only through the generated client. Dev requests to `/api` are proxied to port 3000, so there is no CORS setup.
- **apps/docs** — this site (VitePress).
- **specs/** — spec-driven-development artifacts, one folder per feature.

## Changing the contract

1. Edit `apps/api/prisma/schema.prisma` → `pnpm db:migrate`.
2. Update the controller and its DTOs (`@ApiOkResponse` on responses, `class-validator` on inputs — without them the spec says `any` and the client loses its types).
3. With the API running: `pnpm --filter @app/api-client generate`.
4. `pnpm typecheck` — the web app now fails loudly wherever the contract broke.
