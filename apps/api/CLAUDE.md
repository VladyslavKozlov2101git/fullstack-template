# apps/api — NestJS + Prisma

Postgres via `pnpm db:up`. Copy `.env.example` → `.env` first. Dev: `pnpm --filter api dev` (port
3000). OpenAPI: Swagger UI at `/api/docs`, spec at `/api/docs-json`. All routes are under the `/api`
prefix.

## Commands

- `pnpm --filter api dev` / `build` / `test` / `typecheck`
- `pnpm --filter api prisma migrate dev --name <slug>` — schema change + migration
- `pnpm --filter api prisma studio` — inspect data

## Rules

- One module per domain concept: `src/<thing>/` with `.module.ts`, `.controller.ts`, `.service.ts`,
  `*.dto.ts`. Flat files at `src/` root are app-wide wiring only. Procedure: the **nest-module**
  skill.
- Controllers do HTTP, services do logic, Prisma only in services. No `PrismaService` in a
  controller.
- **Every** request body and query gets a DTO class with `class-validator` decorators, and every
  response gets `@ApiOkResponse({ type: Dto })`. Without them the OpenAPI spec says `any` and the
  whole frontend loses its types — the global `ValidationPipe` uses `whitelist: true`, so an
  undecorated DTO receives nothing at all.
- Never edit `prisma/migrations/**`. Wrong migration → new migration. Procedure: the
  **prisma-migration** skill.
- Schema change → `pnpm db:migrate` → `pnpm api:generate` (API must be running). In that order.
- Secrets come from `process.env`, and every new var goes in `.env.example`.
