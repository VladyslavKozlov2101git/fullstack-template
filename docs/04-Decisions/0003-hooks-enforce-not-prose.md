---
type: decision
status: accepted
date: 2026-10-19
tags:
  - decision
  - process
  - agents
---

# 0003. Hooks enforce, CLAUDE.md advises

## Context

Four mechanisms shape how an agent works in this repo: `CLAUDE.md` rules, skills, subagents and
hooks. Only hooks are guaranteed to run. A rule written in prose is advice that competes for
attention with everything else in the context window; the more rules, the weaker each one.

## Decision

Anything that must not slip is a hook or a permission rule, not prose:

- `PostToolUse(Edit|Write)` → `scripts/claude/format.sh` formats the file that just changed.
- `Stop` → `scripts/claude/check.sh` refuses to end a turn while typecheck or lint are red.
- `.githooks/pre-commit` runs lint-staged plus a workspace typecheck; `commit-msg` and `pre-push`
  guard message format and branch protection.
- `permissions.deny` covers generated files, `dist`, `.env` and the migration folder.

`CLAUDE.md` then carries only short, always-true statements, and procedures move into skills that
load on demand.

## Consequences

- A turn cannot end on a type error, which removes a whole class of "it looked done" handoffs.
- `check.sh` has to be cheap and safe: it skips turns that changed no `.ts`/`.tsx`, and gives up
  after three blocked attempts so a session can never be trapped in a loop it cannot exit.
- Tests are deliberately _not_ in the Stop hook — too slow per turn. Running them stays a documented
  obligation, which is exactly the weaker kind of guarantee this decision is about. Accepted
  knowingly.
- Hooks are plain `sh` and parse their payload with node, because this machine has no `jq`.

## Sources

- [[Workflow]]
