---
type: onboarding
tags:
  - setup
---

# Local setup

Node 26 (LTS) and pnpm 12. Docker only for Postgres.

Node 25 and later no longer ship corepack, so on Node 26 install pnpm once yourself:
`npm install -g pnpm`. pnpm 11 and later read `packageManager` in `package.json` and switch to the
pinned version on their own; pnpm 10 cannot switch to 12 (it fails to launch it), so upgrade a
global pnpm 10 rather than relying on that.

pnpm refuses package versions published less than a day ago (`minimumReleaseAge`, default since
pnpm 11) — a supply-chain guard. An upgrade that wants something released this morning fails until
tomorrow; wait, or pin the previous version. Don't turn the guard off.

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
