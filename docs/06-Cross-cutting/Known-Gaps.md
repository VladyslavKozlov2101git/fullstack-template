---
type: cross-cutting
tags:
  - gaps
---

# Known gaps

What this template does **not** have. Each line is verified, not suspected — a gap written down is a
decision deferred, a gap undocumented is a trap.

## Login has no rate limiting

[[Authorization]] shipped without throttling or lockout on `POST /auth/login`, deliberately — it is
a separate concern with its own dependency. A public login endpoint without it is brute-forceable,
and the scrypt cost in `apps/api/src/auth/password.ts` is deliberately below the OWASP floor
_because_ nothing throttles the endpoint. Both move together: add throttling, then raise the cost.

Registration enumerates accounts for free, which is the same family of problem. `POST /auth/login`
is uniform in message, status and timing — the unknown-email path verifies against a decoy digest so
it costs the same — but `POST /auth/register` has to answer 409 on a taken email, so existence is
discoverable through the front door. Open self-registration without a challenge cannot avoid that;
a CAPTCHA or an invite flow can.

> [!info] The gap this replaces
> This section used to read "there is no server-side authentication", found by `spec-reviewer`
> during a pipeline smoke test on 2026-10-19. [[Authorization]] closed it the same day: the API has
> a guard, the session is an httpOnly cookie the server sets, and `GET /users` is no longer public.

## There is no CI

Nothing runs `lint`, `typecheck` or `test` on a push. The checks exist and are enforced locally by
`.githooks/pre-commit` and the Stop hook (see [[0003-hooks-enforce-not-prose]]), which means they are
only as strong as `--no-verify` is unused. A GitHub Actions workflow plus a required status check in
the ruleset closes this; `scripts/protect-branches.sh` already creates the ruleset, it just has no
check to require yet.

## There are no end-to-end tests

`apps/web` has component tests with a stubbed `fetch`; `apps/api` has one unit test, over password
hashing. Nothing exercises the real API against a real Postgres, so the contract loop in
[[System-overview]] is verified by the type system but never at runtime — the auth routes in
[[Authorization]] were checked by hand with `curl`, which is not a thing CI can repeat.

## The deploy path is untested

See the callout in [[Deploy]].
