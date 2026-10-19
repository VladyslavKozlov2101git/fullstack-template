---
type: cross-cutting
tags:
  - gaps
---

# Known gaps

What this template does **not** have. Each line is verified, not suspected — a gap written down is a
decision deferred, a gap undocumented is a trap.

## There is no server-side authentication

`apps/web/src/services/api.ts` attaches `Authorization: Bearer <token>` from a cookie, and
[[Frontend]] gates routes on that cookie through `MainContainer` and `SessionSlice`. **Nothing on the
API verifies any of it.** There is no guard anywhere in `apps/api/src` — `grep -rn 'UseGuards\|AuthGuard\|APP_GUARD' apps/api/src`
returns nothing, so `GET /users` answers any unauthenticated caller.

So the client-side gating is a UX convenience, not a security boundary. Before this template holds
real data, the API needs a guard and token verification, and the cookie should become `httpOnly` and
server-set. Found by the `spec-reviewer` agent during a pipeline smoke test on 2026-10-19.

## There is no CI

Nothing runs `lint`, `typecheck` or `test` on a push. The checks exist and are enforced locally by
`.githooks/pre-commit` and the Stop hook (see [[0003-hooks-enforce-not-prose]]), which means they are
only as strong as `--no-verify` is unused. A GitHub Actions workflow plus a required status check in
the ruleset closes this; `scripts/protect-branches.sh` already creates the ruleset, it just has no
check to require yet.

## There are no end-to-end tests

`apps/web` has component tests with a stubbed `fetch`; `apps/api` has none at all. Nothing exercises
the real API against a real Postgres, so the contract loop in [[System-overview]] is verified by the
type system but never at runtime.

## The deploy path is untested

See the callout in [[Deploy]].
