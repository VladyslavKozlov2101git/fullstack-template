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

The panel's own login in [[Admin-Panel]] does have a limiter — five attempts per five minutes,
built into `@adminjs/express` — so the two login paths in this repo differ. That is not a model
for `/auth/login`: the limiter is per-process and in-memory, which is adequate for one admin
and not for an app's front door.

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

`apps/web` has component tests with a stubbed `fetch`; `apps/api` has unit tests over password
hashing, the session cookie and the [[Admin-Panel]] allowlist and payload hooks. Nothing exercises
the real API against a real Postgres, so the contract loop in [[System-overview]] is verified by the
type system but never at runtime — the auth routes in
[[Authorization]] were checked by hand with `curl`, which is not a thing CI can repeat.

## The admin panel keeps sessions in memory

[[Admin-Panel]] uses express-session's default `MemoryStore`. Admin sessions are lost on every
restart, do not work across more than one instance, and express-session logs a warning about it
in production. It is adequate for a handful of admins on one process and it is the reason the
panel cannot be scaled horizontally as it stands. A shared store closes it.

## Sensitive fields are hidden by name, not by a check

[[Admin-Panel]] generates its screens from the Prisma schema, so a new model is exposed the
moment it is added — which is the point. The flip side is that a column holding something
secret is visible and writable until its name is added to the `SECRET_FIELDS` set in
`../../apps/api/src/admin/admin-resources.ts`. `password` is there; nothing enforces that the
next one will be. A lint rule or a naming convention with a hook would close this; prose cannot
(see [[0003-hooks-enforce-not-prose]]).

## The deploy path is untested

See the callout in [[Deploy]]. [[Admin-Panel]] inherits this one whole. It was verified locally,
including through a real nginx and with `NODE_ENV=production`, but over plain http — so the TLS
half of the deployment is still unexercised, and the environment the request asked for does not
exist yet.
