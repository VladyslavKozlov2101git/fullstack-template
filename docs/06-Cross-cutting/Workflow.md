---
type: cross-cutting
tags:
  - process
  - agents
---

# Workflow

How work moves through this repo: the git model, the feature cycle, and how Claude is set up to run
inside it. Decisions behind it: [[0002-two-long-lived-branches]], [[0003-hooks-enforce-not-prose]].

## Branches

```
master        always deployable, only receives PRs from development
development   integration branch, default PR target
  feat/… fix/… chore/… docs/…
```

Direct pushes to the two long-lived branches are blocked by `.githooks/pre-push` locally and by the
GitHub ruleset on the server. Commits follow Conventional Commits, checked by
`.githooks/commit-msg`. `pre-commit` runs lint-staged plus a workspace typecheck. Every hook takes
`--no-verify` when you genuinely need out.

Hooks activate on `pnpm install` — the `prepare` script points `core.hooksPath` at `.githooks`.
There is no husky.

First push to a new remote, then turn on server-side enforcement:

```sh
git remote add origin git@github.com:<you>/<repo>.git
git push --no-verify -u origin master development
sh scripts/protect-branches.sh      # needs the gh CLI
```

## Adding a feature

Drop the brief into a session and say `/feature spec` — or just hand it over, since the root
`CLAUDE.md` routes feature requests into the same pipeline. Each phase is a separate invocation in a
separate session, because the artifacts in `specs/<feature>/` carry the state between phases, not
the context window:

```
/feature spec     → specs/NNN-slug/request.md + spec.md   you approve the criteria
/feature plan     → plan.md + tasks.md                    you approve the plan
/feature build    → code, tests, one commit per task
/feature review   → spec-reviewer + reviewer, then PR     you review the PR
```

When the feature ships, its page in `03-Features/` is what survives — the spec was the working
document, the page is the knowledge. Create it from [[Feature|99-Templates/Feature]].

### Who runs what

| Work                                       | Runs as                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| requirements interview, architecture calls | the main session (Opus)                                                |
| codebase research                          | `Explore` agent                                                        |
| writing `spec.md` / `plan.md` / `tasks.md` | `doc-writer` agent (sonnet)                                            |
| implementation                             | the main session — delegating it hides the diff you are meant to judge |
| diagnosing a failing test run              | `test-runner` agent                                                    |
| review before the PR                       | `spec-reviewer` + `reviewer`, in parallel, clean context               |

Haiku pays off only for mechanical passes with no judgement in them. Spec and plan writing is not
that.

### The three checkpoints

You control the spec, the plan and the finished PR. Between them the work runs on automatic checks
rather than on your attention: hooks, tests, and the two reviewer agents.

| Phase  | Mode                                     | Your job                                                                                                                                                              |
| ------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec   | normal                                   | describe the feature, then let Claude interview you until nothing is ambiguous. Read and edit the acceptance criteria — the highest-leverage 15 minutes in the cycle. |
| Plan   | plan mode                                | check the first task fixes the API contract and the rest builds on it. An architecture mistake caught here is the cheapest one you will ever catch.                   |
| Build  | `claude --worktree`, acceptEdits or auto | step in only when Claude asks or stalls. It works down `tasks.md`: implement, test, commit.                                                                           |
| Review | normal                                   | read the spec-compliance report, then the PR.                                                                                                                         |

Before the PR: `pnpm lint && pnpm typecheck && pnpm test`. PR into `development`, squash-merge.

## Running more than one feature at once

Start sequential. Use subagents only for research, test runs and review until the cycle above is
smooth and the rules and skills have stopped needing edits — usually two or three features.

After that, one worktree per feature, watched through `claude agents`. Two constraints:

- **Only one branch at a time may change `schema.prisma`.** Two that do will conflict in the schema
  and in migration order. Run schema-free features in parallel instead, or generate the migration
  only after rebasing onto fresh `development`.
- **Your review is the bottleneck, not Claude.** Three parallel features means three PRs you have to
  actually read. For one developer, more than two or three streams rarely pays off.

Inside a single feature, contract-first buys real parallelism: once the contract task is done, the
Nest implementation and the React UI are independent. One integration task closes it.

## When Claude repeats a mistake

Twice is a signal to change the system, not just the code — a rule in `CLAUDE.md`, a step in a
skill, or a check in a hook. After a month of this the configuration is the most valuable part of
the repo.

## Releasing

PR `development` → `master` and merge (not squash), so `master` keeps the history. Urgent production
fix: branch `fix/…` off `master`, PR into `master`, then merge `master` back into `development`.
