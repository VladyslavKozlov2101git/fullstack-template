# fullstack-template

pnpm + Turborepo monorepo. NestJS API, React web, VitePress docs, OpenAPI-generated client.

## Layout

- `apps/api` — NestJS + Prisma (Postgres). Owns the schema; exposes OpenAPI at `/api/docs-json`.
- `apps/web` — React + Vite. Consumes `@app/api-client`, never hand-writes request types.
- `apps/docs` — VitePress.
- `packages/api-client` — generated from the API's OpenAPI spec. **Never edit by hand.**
- `specs/` — SDD artifacts (one folder per feature).

## Commands

| | |
|---|---|
| `pnpm db:up` | Postgres in Docker |
| `pnpm dev` | all apps (turbo) |
| `pnpm --filter api dev` | one app |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm build` / `lint` / `test` / `typecheck` | across the workspace |
| `pnpm --filter @app/api-client generate` | regenerate client (API must be running) |

## Rules

- Node 24, pnpm 10. Don't add npm/yarn lockfiles.
- Cross-package imports go through the package name (`@app/api-client`), not relative paths.
- Adding a dependency: `pnpm --filter <pkg> add <dep>`. Root deps are tooling only.
- Schema change → migration → `pnpm --filter @app/api-client generate`. In that order.
- No new dependency for something stdlib or the platform already does.

## Git

- Branches: `feat/`, `fix/`, `chore/`, `docs/` + short kebab slug.
- Commits: Conventional Commits with the app as scope — `feat(api): add booking endpoint`.
- One logical change per commit. Don't commit generated output (see `.gitignore`).
