---
type: feature
status: shipped
apps:
  - api
  - web
spec: "specs/001-auth-login/spec.md"
tags:
  - feature
  - auth
---

# Authorization

> Email + password accounts. The API issues a JWT in an httpOnly cookie and verifies it on every
> guarded request, so route gating is a security boundary rather than a UX convenience.

## Overview

Before this, the template only pretended to have auth: `/auth/sign-in` and `/auth/sign-up` rendered
a literal `<h2>`, a `SessionSlice` held a token nothing ever issued, and no guard existed anywhere
in the API. [[Known-Gaps]] recorded it.

Three things decide how the rest of this page reads:

1. **The session is an httpOnly cookie.** JavaScript cannot read it, which is the point — an XSS
   cannot steal the token. The consequence is that the client cannot answer "am I signed in?" on its
   own, so it asks: `GET /auth/me`.
2. **Hashing is `node:crypto` scrypt**, not bcrypt or argon2. The standard library covers it, and
   the root `CLAUDE.md` forbids a dependency for what it already does. `@nestjs/jwt` is the one
   dependency the feature added, because hand-rolling a token format is the wrong kind of frugal.
3. **The API's error message is what the form shows.** That makes `message` part of the
   [[Glossary|contract]], which is why `ApiErrorDto` exists and why the generated client types it.

## User flow

- **Sign up** at `/auth/sign-up` with email + password. The account is created and signed in at
  once; there is no confirmation email.
- **Sign in** at `/auth/sign-in`. A wrong password and an unknown email return the same 401 with the
  same message, so the response cannot be used to find out who has an account.
- **Anything under `/main`** redirects to sign-in when `GET /auth/me` says nobody is signed in, and
  the two auth pages redirect inward when it says somebody is.
- **Sign out** from the header clears the cookie server-side. The guard notices and navigates —
  no page reload.

## Backend

See [[Backend]]. Module: `../../apps/api/src/auth/`.

| Route                 | Code | Notes                                                     |
| --------------------- | ---- | --------------------------------------------------------- |
| `POST /auth/register` | 201  | sets the cookie; 409 when the email is taken              |
| `POST /auth/login`    | 200  | sets the cookie; one 401 for every kind of bad credential |
| `POST /auth/sign-out` | 204  | clears the cookie; unguarded, because it is idempotent    |
| `GET /auth/me`        | 200  | guarded; the session's own user                           |
| `GET /users`          | 200  | guarded as part of this feature — it used to be public    |

Things that will look odd later and are deliberate:

- **`PrismaService` omits `password` globally.** Without it `user.findMany()` returns the digest,
  Prisma's `User` is structurally assignable to `UserDto`, and `GET /users` serves every hash while
  `tsc` stays happy. The auth service opts back in with `omit: { password: false }` exactly where it
  needs to verify a login. Exposure is now explicit and local.
- **scrypt runs at `N=2^15`, below OWASP's `N=2^17` floor.** 2^17 costs ~134 MB per hash, and with
  no rate limiting on login (see Open questions) an expensive KDF is a memory-exhaustion lever
  rather than a defence. Digests are stored as `scrypt$N$r$p$salt$digest`, so the parameters travel
  with them and the cost can be raised later without locking anyone out.
- **`LoginDto` and `RegisterDto` are separate classes.** A shared [[Glossary|DTO]] with
  `@MinLength(8)` would answer 400 — showing the registration rule — when somebody signs in with a
  short wrong password, instead of the single 401 the spec requires.
- **`JwtModule` is registered with `global: true`.** The guard is used from `UsersModule` too, and a
  guard resolves its dependencies from the injector of the module declaring the controller. Without
  it the app does not boot.
- **No `cookie-parser` and no passport.** The guard reads one cookie off the request header,
  matching the name exactly so `my_access_token=` cannot pass as the session. `res.cookie` is native
  to Express.
- **The guard reloads the user every request**, so deleting a user ends their session immediately
  instead of when the token expires.

## Frontend

See [[Frontend]]. Pages: `../../apps/web/src/pages/SignIn/`, `../../apps/web/src/pages/SignUp/`.

RTK Query's `"Me"` cache entry **is** the session. There is no slice: with an httpOnly cookie there
is nothing for the client to mirror. Every auth mutation invalidates `"Me"`, which is also how
signing in works — the cached 401 is refetched, and the guard reacts.

Both guards (`AuthContainer`, `MainContainer`) gate on `isSuccess`/`isError`, never `isLoading`.
RTK Query's first render is `isUninitialized` with `isLoading: false` and no data, so a
`!isLoading && !data` test would redirect every visitor on mount. They redirect during render with
`<Navigate replace/>` rather than from an effect, so the protected page never mounts, never fires a
request that 401s, and never leaves a history entry the Back button falls into.

`api.ts` no longer redirects on a 401 from an auth endpoint. That branch used to hard-replace the
page unless the path was already `/auth/sign-in`, which made `/auth/sign-up` unreachable: a cold
load there calls `/auth/me`, gets a 401 and bounces before rendering.

The password field passes `isPassword` **alone**. Adding `type="password"` as well defeats the
show/hide toggle, because the component falls back to `type` the moment it flips.

> [!warning] Cross-origin deployments
> `createApiClient` sets no `credentials`, which is correct for dev — the Vite proxy makes `/api`
> same-origin. Point `VITE_API_URL` at another origin and the browser discards `Set-Cookie` with no
> error anywhere: login appears to succeed and `/auth/me` then 401s forever. Such a deployment needs
> `credentials: "include"` and CORS with credentials on the API. Confirm the topology before
> deploying — see [[Deploy]].

## Open questions

- [ ] **No rate limiting or lockout on `/auth/login`.** Deferred deliberately, not overlooked: it is
      a separate concern with its own dependency. A public login endpoint without it is
      brute-forceable, and the scrypt cost above is chosen for a world without it. Tracked in
      [[Known-Gaps]].
- [ ] **Registration enumerates accounts.** Login is uniform in message, status _and_ timing — the
      unknown-email path verifies against a decoy digest so it costs the same — but
      `POST /auth/register` answers 409 on a taken email, so anyone can still discover whether an
      address has an account. That is inherent to open self-registration without a challenge:
      closing it means a CAPTCHA or an invite flow, not a change to the login path.
- [ ] No password reset, no email confirmation, no refresh-token rotation, no roles. All out of
      scope in the spec, none of them blocked by what shipped.
- [ ] `InputElement`'s `isForgot` prop links to `//auth/sign-in` — a protocol-relative URL pointing
      at a host called `auth`. Unused here, so it was left alone; it needs a one-character fix
      before a forgot-password flow uses it.

## Decisions

- [[0001-contract-first-openapi]] — the error body is declared as a DTO so the form compiles against
  the text it renders.
- [[0003-hooks-enforce-not-prose]] — two template bugs surfaced because the Stop hook would not let
  a red turn end: `pnpm db:migrate` never ran Prisma, and lint-staged failed on the generated client.

## Sources

- `../../specs/001-auth-login/spec.md` — the approved spec and its 19 acceptance criteria
- `../../specs/001-auth-login/plan.md` — the approach and why each part is shaped this way
