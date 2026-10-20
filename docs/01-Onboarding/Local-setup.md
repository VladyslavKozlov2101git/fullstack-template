---
type: onboarding
tags:
  - setup
---

# Local setup

Node >= 22.22 and pnpm 10. Docker only for Postgres.

```sh
pnpm install                          # also activates the git hooks
cp apps/api/.env.example apps/api/.env
pnpm db:up                            # Postgres 17 in Docker
pnpm db:migrate                       # apply Prisma migrations
pnpm dev                              # api :3000, web :5173
```

|              | URL                            |
| ------------ | ------------------------------ |
| web          | `localhost:5173`               |
| api          | `localhost:3000/api`           |
| Swagger UI   | `localhost:3000/api/docs`      |
| OpenAPI spec | `localhost:3000/api/docs-json` |
| Admin panel  | `localhost:3000/admin`         |

The admin panel needs two variables set in `apps/api/.env` before it does anything: an
`ADMIN_SESSION_SECRET` (`openssl rand -hex 32`) or the API will not boot, and `ADMIN_EMAILS`
listing an address that already has an account, or it will admit nobody. See [[Admin-Panel]].

`pnpm install` runs `prepare`, which points `core.hooksPath` at `.githooks` — that is what activates
the commit and push guards described in [[Workflow]]. There is no husky.

## Commands

|                                     |                                                   |
| ----------------------------------- | ------------------------------------------------- |
| `pnpm dev`                          | every app in parallel                             |
| `pnpm --filter web dev`             | one app (`web`, `api`)                            |
| `pnpm build` / `test` / `typecheck` | across the workspace, cached by turbo             |
| `pnpm lint` / `lint:fix` / `format` | oxlint + oxfmt + prettier over the repo           |
| `pnpm db:up` / `db:migrate`         | Postgres container / Prisma migration             |
| `pnpm api:generate`                 | regenerate the typed client (API must be running) |
| `pnpm docs:lint`                    | check this vault for broken links and orphans     |
| `pnpm db:studio`                    | Prisma Studio — browse and edit rows locally      |

## This vault

Open the `docs/` folder as an Obsidian vault — `File → Open folder as vault`. `.obsidian/` is
gitignored, so your own layout, plugins and theme stay yours. Set the template folder to
`99-Templates` in `Settings → Templates` to get the page templates on a hotkey.

Rules for editing it: [[AGENTS.md]].
