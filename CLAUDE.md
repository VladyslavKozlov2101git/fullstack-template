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

Two long-lived branches, everything else is short-lived:

```
master        always deployable. Only ever receives PRs from development.
development   integration branch, default PR target. Deploy to staging.
  feat/…      branched off development, merged back by PR, deleted after.
  fix/… chore/… docs/…
```

- Branch names: `feat/`, `fix/`, `chore/`, `docs/` + short kebab slug.
- Commits: Conventional Commits with the app as scope — `feat(api): add booking endpoint`. Enforced by `.githooks/commit-msg`.
- Never push to `master` or `development` directly — `.githooks/pre-push` blocks it locally, the GitHub ruleset blocks it for real. Both hooks take `--no-verify` when you genuinely need out.
- Squash-merge feature PRs into `development`. Merge (not squash) `development` → `master`, so master keeps the history.
- Urgent production fix: branch `fix/…` off `master`, PR into `master`, then merge `master` back into `development`. No separate hotfix flow.
- One logical change per commit. Don't commit generated output (see `.gitignore`).

### First push to a new remote

The pre-push hook blocks `master` and `development`, including their first push, so seed them once and then turn on the server-side rules:

```sh
git remote add origin git@github.com:<you>/<repo>.git
git push --no-verify -u origin master development
sh scripts/protect-branches.sh
```

Hooks are activated by `pnpm install` (the `prepare` script sets `core.hooksPath`). Server-side rules: run `scripts/protect-branches.sh` once per repo.
