# fullstack-template

Monorepo template: NestJS API, React SPA, an Obsidian docs vault, and a typed API client generated
from the API's own OpenAPI spec — so a backend contract change breaks the frontend build instead of
production.

|                 |                      |
| --------------- | -------------------- |
| Node            | >= 22.22             |
| Package manager | pnpm 10              |
| Task runner     | Turborepo            |
| Database        | Postgres 17 (Docker) |

## Quick start

```sh
pnpm install                          # also activates the git hooks
cp apps/api/.env.example apps/api/.env
pnpm db:up                            # Postgres in Docker
pnpm db:migrate                       # apply Prisma migrations
pnpm dev                              # api :3000, web :5173
```

|              | URL                            |
| ------------ | ------------------------------ |
| web          | `localhost:5173`               |
| api          | `localhost:3000/api`           |
| Swagger UI   | `localhost:3000/api/docs`      |
| OpenAPI spec | `localhost:3000/api/docs-json` |

## Layout

```
apps/
  api/          NestJS 11 + Prisma 6 — owns the DB schema and the HTTP contract
  web/          React 19 + Vite — Redux Toolkit, RTK Query, SCSS modules, plop
packages/
  api-client/   @repo/api-client — generated from the OpenAPI spec, committed, never hand-edited
docs/           the knowledge base — an Obsidian vault (MOC, ADRs, runbooks, journal)
specs/          spec-driven-development artifacts (Spec Kit / OpenSpec)
.claude/        agents, skills and permission rules for Claude Code
.githooks/      commit-msg + pre-push + pre-commit (no husky)
scripts/        protect-branches.sh — one-shot GitHub ruleset setup
```

Each app has its own `CLAUDE.md` with the rules that apply inside it. Start with
[CLAUDE.md](CLAUDE.md).

## Commands

|                                     |                                                         |
| ----------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                          | every app, in parallel                                  |
| `pnpm --filter web dev`             | just one app (`web`, `api`, `docs`)                     |
| `pnpm build` / `test` / `typecheck` | across the workspace, cached by turbo                   |
| `pnpm lint` / `lint:fix` / `format` | oxlint + oxfmt + prettier over the repo                 |
| `pnpm plop`                         | scaffold a web component (tsx + module.scss + index.ts) |
| `pnpm db:up` / `db:migrate`         | Postgres container / Prisma migration                   |
| `pnpm api:generate`                 | regenerate the typed client (API must be running)       |

## The contract loop

This is the one workflow worth learning, because everything else follows from it:

```
prisma/schema.prisma ──▶ NestJS controller + DTOs ──▶ /api/docs-json
                                                           │
                                       openapi-typescript  ▼
apps/web  ◀── RTK Query ◀── services/api.ts ◀── @repo/api-client
```

1. Change `apps/api/prisma/schema.prisma`, then `pnpm db:migrate`.
2. Update the controller. Inputs need `class-validator` DTOs, responses need
   `@ApiOkResponse({ type: Dto })` — without them the spec says `any` and the frontend silently
   loses its types.
3. With the API running: `pnpm api:generate`.
4. `pnpm typecheck` — the web app now fails exactly where the contract broke.

Frontend types are always derived from the spec, never re-declared:

```ts
export type USER = paths["/users"]["get"]["responses"][200]["content"]["application/json"][number];
```

## Git workflow

Two long-lived branches; everything else is short-lived and merged by PR.

```
master        always deployable, only receives PRs from development
development   integration branch, default PR target
  feat/… fix/… chore/… docs/…
```

- Direct pushes to `master` and `development` are blocked locally by `.githooks/pre-push` and for
  real by the GitHub ruleset.
- Commits follow Conventional Commits (`feat(api): add booking endpoint`), enforced by
  `.githooks/commit-msg`.
- `pre-commit` runs lint-staged + typecheck. Every hook takes `--no-verify` when you genuinely need
  out.
- Hooks activate on `pnpm install` (the `prepare` script sets `core.hooksPath`) — there is no husky.

First push to a new remote, then turn on server-side enforcement:

```sh
git push --no-verify -u origin master development
sh scripts/protect-branches.sh      # needs the gh CLI
```

## Deployment

`apps/web/conf/dev.nginx` is a starting point: it serves the built SPA and reverse-proxies `/api/`
to the API, keeping the frontend same-origin so no CORS config is needed anywhere. It ships with CSP
and the other OWASP A05 headers — tighten the CSP once you know your real origins.
