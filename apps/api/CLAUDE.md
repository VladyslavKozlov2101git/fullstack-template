# apps/api — NestJS + Prisma

Postgres via `pnpm db:up`. Copy `.env.example` → `.env` first. Dev: `pnpm --filter api dev` (port
3000). OpenAPI: Swagger UI at `/api/docs`, spec at `/api/docs-json`. All routes are under the `/api`
prefix.

## Commands

- `pnpm --filter api dev` / `build` / `test` / `typecheck`
- `pnpm --filter api prisma migrate dev --name <slug>` — schema change + migration
- `pnpm --filter api prisma studio` — inspect data

## Rules

- One module per domain concept: `src/<thing>/` with `.module.ts`, `.controller.ts`, `.service.ts`.
  Flat files at `src/` root are for app-wide wiring only.
- Controllers do HTTP, services do logic, Prisma only in services. No `PrismaService` in a
  controller.
- **Every** request body and query gets a DTO class with `class-validator` decorators. The global
  `ValidationPipe` uses `whitelist: true`, so undecorated fields are silently dropped — an
  undecorated DTO means no input at all.
- Response shapes need `@ApiOkResponse({ type: Dto })` or they land in the OpenAPI spec as `any` and
  the generated client goes untyped.
- Never edit `prisma/migrations/**`. Wrong migration → new migration.
- Changed the schema? Migrate, then regenerate the client: `pnpm --filter @repo/api-client generate`
  (API must be running).
- Secrets come from `process.env`, and every new var goes in `.env.example`.
