---
type: architecture
tags:
  - architecture
---

# System overview

```
apps/web  ──uses──▶  @repo/api-client  ──generated from──▶  apps/api OpenAPI spec
                                                                   │
                                                            Prisma ▼
                                                               Postgres
```

- **[[Backend]]** (`apps/api`) owns the database schema and the HTTP contract. Every route sits
  under `/api`; the spec is served at `/api/docs-json`.
- **packages/api-client** turns that spec into types (`openapi-typescript`) and a client
  (`openapi-fetch`). Generated, committed, never hand-edited.
- **[[Frontend]]** (`apps/web`) talks to the API only through that client. Dev requests to `/api`
  are proxied to port 3000, so there is no CORS configuration anywhere.

Why it is built this way: [[0001-contract-first-openapi]].

## The contract loop

The one workflow worth learning, because everything else follows from it:

1. Edit `apps/api/prisma/schema.prisma` → `pnpm db:migrate`.
2. Update the controller and its DTOs — `class-validator` on inputs, `@ApiOkResponse({ type: Dto })`
   on responses. Without them the spec says `any` and the frontend silently loses its types.
3. With the API running: `pnpm api:generate`.
4. `pnpm typecheck` — the web app now fails exactly where the contract broke.

Procedures: the `nest-module` and `prisma-migration` skills in `apps/api/.claude/skills/`.

Frontend types are always derived, never re-declared:

```ts
export type USER = paths["/users"]["get"]["responses"][200]["content"]["application/json"][number];
```

## Where the seams are

| Boundary                                     | Enforced by                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| web must not import from api                 | review, and the fact that web has no api dependency                                |
| web must not hand-write request types        | `models/*.model.ts` derive from `paths`; typecheck catches drift                   |
| api must not leak Prisma models as responses | DTOs with `@ApiProperty`, which is also what the spec needs                        |
| generated client must not be edited          | `Edit(./packages/api-client/src/schema.d.ts)` is denied in `.claude/settings.json` |
