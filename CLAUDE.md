# fullstack-template

pnpm + Turborepo monorepo. NestJS API, React web, OpenAPI-generated client, Obsidian docs vault.

## Layout

- `apps/api` — NestJS + Prisma (Postgres). Owns the schema; exposes OpenAPI at `/api/docs-json`.
- `apps/web` — React + Vite. Redux Toolkit + RTK Query, SCSS modules, plop generator. Consumes
  `@repo/api-client`, never hand-writes request types.
- `docs/` — the knowledge base: an Obsidian vault. Rules for editing it are `docs/AGENTS.md`; the
  entry point is `docs/00-Home/Index.md`.
- `packages/api-client` — generated from the API's OpenAPI spec. **Never edit by hand.**
- `specs/` — SDD artifacts (one folder per feature).

## Commands

|                                     |                                         |
| ----------------------------------- | --------------------------------------- |
| `pnpm db:up`                        | Postgres in Docker                      |
| `pnpm dev`                          | all apps (turbo)                        |
| `pnpm --filter api dev`             | one app                                 |
| `pnpm db:migrate`                   | Prisma migrate dev                      |
| `pnpm build` / `test` / `typecheck` | across the workspace                    |
| `pnpm api:generate`                 | regenerate client (API must be running) |
| `pnpm lint` / `lint:fix` / `format` | oxlint + oxfmt + prettier, whole repo   |
| `pnpm plop`                         | scaffold a web component                |

## Rules

- Node 24, pnpm 10. Don't add npm/yarn lockfiles.
- Cross-package imports go through the package name (`@repo/api-client`), not relative paths.
- Adding a dependency: `pnpm --filter <pkg> add <dep>`. Root deps are tooling only.
- Schema change → migration → `pnpm api:generate`. In that order.
- No new dependency for something stdlib or the platform already does.
- Lint/format config lives at the root only (`.oxlintrc.json`, `.prettierrc`, `.lintstagedrc`).
  Don't add per-package copies.

## How this repo is set up for Claude

Four mechanisms, each doing one job. The split matters: **CLAUDE.md advises, hooks enforce** —
anything that must not slip belongs in a hook or a permission rule, not in prose here.

|        | Where                                         | Does                                                                                                                             |
| ------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| rules  | this file + per-app `CLAUDE.md`               | always loaded; short and always true                                                                                             |
| skills | `.claude/skills/`, `apps/api/.claude/skills/` | procedures, loaded on demand — `feature` (the SDD pipeline), `nest-module`, `prisma-migration`                                   |
| agents | `.claude/agents/`                             | `reviewer` (correctness, scope), `spec-reviewer` (spec compliance), `test-runner`, `doc-writer` (writes spec/plan/tasks, sonnet) |
| hooks  | `.claude/settings.json` → `scripts/claude/`   | `format.sh` after every edit; `check.sh` refuses to end a turn while typecheck or lint are red                                   |

`check.sh` skips turns that changed no `.ts`/`.tsx`, and gives up after three blocked attempts so a
session can never be trapped. Both hooks are plain `sh` and read their payload with node — this
machine has no `jq`.

Run the tests yourself after each task; the Stop hook deliberately does not (too slow to run every
turn).

**A feature request arriving here — a ТЗ, a ticket, "implement X" — goes through the `feature`
skill, not straight into code.** It runs the SDD cycle one session per phase (spec → plan → build →
review): research delegated to `Explore`, document writing to `doc-writer`, review to
`spec-reviewer` + `reviewer`. Always say which phase you are in. The user approves the spec, the
plan and the PR; everything between those is yours. A one-line fix is not a feature — use judgement,
but when in doubt write the spec.

If the same mistake happens twice, change the system rather than the code: a rule here, a step in a
skill, or a check in a hook.

## Git

Two long-lived branches, everything else is short-lived:

```
master        always deployable. Only ever receives PRs from development.
development   integration branch, default PR target. Deploy to staging.
  feat/…      branched off development, merged back by PR, deleted after.
  fix/… chore/… docs/…
```

- Branch names: `feat/`, `fix/`, `chore/`, `docs/` + short kebab slug.
- Commits: Conventional Commits with the app as scope — `feat(api): add booking endpoint`. Enforced
  by `.githooks/commit-msg`.
- Never push to `master` or `development` directly — `.githooks/pre-push` blocks it locally, the
  GitHub ruleset blocks it for real. Both hooks take `--no-verify` when you genuinely need out.
- Squash-merge feature PRs into `development`. Merge (not squash) `development` → `master`, so
  master keeps the history.
- Urgent production fix: branch `fix/…` off `master`, PR into `master`, then merge `master` back
  into `development`. No separate hotfix flow.
- One logical change per commit. Don't commit generated output (see `.gitignore`).

### First push to a new remote

The pre-push hook blocks `master` and `development`, including their first push, so seed them once
and then turn on the server-side rules:

```sh
git remote add origin git@github.com:<you>/<repo>.git
git push --no-verify -u origin master development
sh scripts/protect-branches.sh
```

Hooks are activated by `pnpm install` (the `prepare` script sets `core.hooksPath`). Server-side
rules: run `scripts/protect-branches.sh` once per repo.
