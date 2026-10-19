# Workflow

## Branches

```
master        always deployable, only receives PRs from development
development   integration branch, default PR target
  feat/… fix/… chore/… docs/…
```

Direct pushes to the two long-lived branches are blocked by `.githooks/pre-push` locally and by the
GitHub ruleset on the server. Commits follow Conventional Commits, checked by
`.githooks/commit-msg`. `pre-commit` runs lint-staged plus a workspace typecheck.

Hooks activate on `pnpm install` — the `prepare` script points `core.hooksPath` at `.githooks`.
There is no husky.

## Adding a feature

1. `git switch -c feat/thing` off `development`.
2. Write the spec in `specs/` if the change is non-trivial.
3. Backend first if the contract moves: schema → migration → controller + DTOs →
   `pnpm api:generate`.
4. Frontend: `pnpm plop` for new components, RTK Query endpoint in `services/cachedAPI.ts`, page
   under `pages/`.
5. `pnpm lint && pnpm typecheck && pnpm test`.
6. PR into `development`, squash-merge.

## Releasing

PR `development` → `master` and merge (not squash), so `master` keeps the history.

Urgent production fix: branch `fix/…` off `master`, PR into `master`, then merge `master` back into
`development`. No separate hotfix flow.
