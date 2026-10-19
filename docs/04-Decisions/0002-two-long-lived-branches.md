---
type: decision
status: accepted
date: 2026-10-19
tags:
  - decision
  - process
---

# 0002. Two long-lived branches, no git-flow

## Context

A solo developer running several agent-driven features at once still needs somewhere always
deployable and somewhere to integrate. Full git-flow (release branches, hotfix branches, a develop
and a main with ceremony between them) costs more attention than it returns at this size.

## Decision

`master` is always deployable and only ever receives PRs from `development`. `development` is the
integration branch and the default PR target. Everything else is short-lived: `feat/`, `fix/`,
`chore/`, `docs/`, merged by PR and deleted.

Direct pushes to the two long-lived branches are blocked locally by `.githooks/pre-push` and for
real by a GitHub ruleset (`scripts/protect-branches.sh`). Commits follow Conventional Commits,
checked by `.githooks/commit-msg`.

An urgent production fix branches `fix/…` off `master`, PRs into `master`, then `master` is merged
back into `development`. No separate hotfix flow.

## Consequences

- Feature PRs squash-merge into `development`; `development` → `master` is a real merge, so `master`
  keeps the history.
- The local hook blocks the _first_ push of both branches to a new remote, so the bootstrap needs
  `git push --no-verify -u origin master development` once.
- Only one branch at a time may change `prisma/schema.prisma` — two will conflict in the schema and
  in migration order. See the `prisma-migration` skill.

## Sources

- [[Workflow]]
