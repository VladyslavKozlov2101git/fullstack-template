# Plan: 001-auth-login

Approved. Read the two constraints below before touching anything.

- **Tasks 1-3 are the API contract and are indivisible.** `pnpm api:generate` needs a running API
  against a migrated DB, and no web file may name the new `paths` before `schema.d.ts` is
  regenerated, or the Stop hook blocks the turn.
- **Fork point: after task 3.** Tasks 4-7 touch no `apps/api` file.

## Context

`specs/001-auth-login/spec.md` is approved: email + password sign-up and sign-in, JWT in an httpOnly
cookie, guard driven by `GET /auth/me`. The template currently ships _fake_ auth: `/auth/sign-in`
and `/auth/sign-up` render a literal `<h2>`, `SessionSlice` holds a token nothing issues, `api.ts`
attaches a `Bearer` header from a JS-readable cookie, and **no guard exists anywhere in
`apps/api/src`**. This feature replaces that with a real server-side session.

Two scope changes were decided after the spec was written, both because research surfaced something
the spec did not know:

- `Header.tsx` already renders a **Sign out** button that dispatches `signOut()` with no server
  call. Under httpOnly it would silently do nothing: the user would believe they logged out while
  the session stayed alive. Sign-out comes **into** scope: `POST /auth/sign-out` + wiring the button
  that already exists.
- `GET /api/users` returns every user's email to anyone. Once a guard exists, closing it is one
  line. It comes **into** scope.

The spec must be amended for both (task 0) or `spec-reviewer` correctly rejects them as scope creep.

Net effect on the codebase is **deletion**: `SessionSlice`, `js-cookie`, the `Bearer` middleware and
the `isAuthed()` cookie read all go away; RTK Query becomes the single source of truth for "who am
I". One new dependency total: `@nestjs/jwt`.

## Approach

**Hashing is stdlib.** `node:crypto` `scrypt` + `randomBytes` + `timingSafeEqual`, per root
CLAUDE.md ("no new dependency for something stdlib already does"). Params
`N=2**15, r=8, p=1, keylen=64`, `maxmem: 64MB` (128*N*r is exactly 32 MiB, which is Node's default
maxmem, so the override is load-bearing). Deliberately **below** OWASP's `N=2^17` floor: 134 MB per
hash with no rate limiting turns an expensive KDF into a memory-exhaustion vector. Stored as
`scrypt$N$r$p$salt$hash` so the params travel with the hash and raising `N` later stays possible; a
bare `salt:hash` would make every existing password unverifiable the moment the cost changes.
`@MaxLength(72)` caps the input.

**No passport, no cookie-parser.** A ~20-line guard reads `request.headers.cookie`, splits on `;`,
trims and compares the cookie name exactly (a prefix search would also match `my_access_token=`).
`res.cookie()` / `res.clearCookie()` are native Express 5 and need no middleware. The guard looks
the user up by `sub` on every request, so a deleted user stops being authenticated.

**The hash must not leak.** `users.service.ts` does `prisma.user.findMany()` with no `select`;
`User & { password }` is structurally assignable to `UserDto[]`, so the moment the column exists the
endpoint serves every hash and **typecheck stays green**. Fixed once, in `prisma.service.ts`, with
Prisma 6 global omit; `auth.service` opts back in where it needs the hash. Same task as the
migration, so there is no commit where the column exists and the leak is open.

**Two DTOs, not one.** A shared `CredentialsDto` with `@MinLength(8)` would make a 7-character wrong
password at sign-in return `400 "password must be longer than or equal to 8"` instead of the single
401 the spec demands. `LoginDto` validates shape only; `RegisterDto` carries the length rule. Both
`@Transform` the email to trimmed lowercase at the boundary (class-transformer is installed,
`transform: true` is already on), which is where case-insensitivity belongs (AC-17).

**`JwtModule` is global.** `JwtModule.register({ global: true, ... })`. Without `global` the guard,
used from `UsersModule`, cannot resolve `JwtService` from that module's injector and the app **will
not boot**.

**Guards gate on `isSuccess`/`isError`, never `isLoading`.** RTK Query's first render is
`isUninitialized: true, isLoading: false, data: undefined`, so any `!isLoading && !data` gate
redirects everyone on mount. The current `useEffect` + `navigate` shape also renders `<Outlet/>`
first (the protected page mounts and 401s) and pushes a history entry. Replaced with a render-time
`<Navigate replace/>`; both containers read the same cache entry, so neither predicate is ever true
at the same time and there is no bounce.

**The 401 middleware needs one condition.** `api.ts` hard-redirects on any 401 unless the path is
already `/auth/sign-in`. On a cold load of `/auth/sign-up`, `getMe` 401s and the page is replaced:
**sign-up is currently unreachable**. It also wipes storage on every failed login and fires
`window.location.replace` in every jsdom test. Exempting `/auth/` endpoints fixes all three: a 401
from an auth endpoint is an answer, not an expired session.

**Sign-out is unguarded and returns 204.** Clearing a cookie is idempotent, so there is nothing to
protect, and a guard would make sign-out fail exactly when the session is already dead (expired
token, deleted user), leaving the browser stuck with a dead cookie. 204 because there is no body.

**`@Res({ passthrough: true })`** on the three routes that set cookies (register, login, sign-out).
Without it Nest treats the handler as having taken over the response, ignores the return value, and
the request hangs.

**`ApiErrorDto` exists because the spec makes the API's `message` the text the form shows** (AC-3,
AC-6), so it is part of the contract the frontend compiles against. `@ApiResponse` without a `type:`
emits no schema and `error` stays `never`. `message` is `string | string[]` (`oneOf`) because that
is Nest's actual shape: ValidationPipe returns an array.

**Forms are controlled `useState`.** `InputElement` always passes `value={value ?? ""}`, so it is
permanently controlled and `FormData` reads cannot work. Pass `isPassword` **alone**: passing
`type="password"` too breaks the eye toggle
(`type={isPassword && !showPassword ? "password" : type}` falls back to `type`).

**Sign-out in the client** checks `response.ok` only. A 204 has no body, so the house `!data` idiom
would report a successful sign-out as an error.

**Rejected**

- `passport` / `cookie-parser`: ~20 lines of guard replace both.
- `bcrypt` / `argon2`: stdlib `scrypt` does it (root CLAUDE.md rule).
- One shared credentials DTO: breaks the single-401 requirement (above).
- Exporting the route array from `src` for tests: a 10-line test-local `createMemoryRouter` is
  smaller.
- Extending `React.InputHTMLAttributes` on `InputElementProps`: collides with the narrowed
  `type`/`value`/`onChange`. Two explicit props instead.

**Risky part.** Tasks 1-3 as a unit (migration against a possibly `db push`ed dev DB, boot with a
global `JwtModule`, generation needing a live API), and the 401 middleware, which silently makes
sign-up unreachable if the `/auth/` exemption is missed.

## Files touched

### Spec

- `specs/001-auth-login/spec.md`: changed (task 0). Sign-out and `/users` guard in scope with new
  criteria (appended, no renumbering); AC-14 paths fixed to `/auth/...`; AC-12 reworded; the
  `type="password"` + `isPassword` line fixed.

### API (`apps/api`)

- `prisma/schema.prisma`: changed. `password String` on `User`.
- `prisma/migrations/<ts>_init_user_with_password/`: new. First migration ever; creates the table
  too.
- `src/prisma.service.ts`: changed. Global `omit: { user: { password: true } }`.
- `package.json`: changed. `@nestjs/jwt` added.
- `src/auth/auth.dto.ts`: new. `LoginDto`, `RegisterDto`, `ApiErrorDto`.
- `src/auth/password.ts`: new. scrypt hash/verify.
- `src/auth/password.spec.ts`: new. Repo's first API test.
- `src/auth/jwt-auth.guard.ts`: new. Cookie-reading guard.
- `src/auth/current-user.decorator.ts`: new.
- `src/auth/auth.service.ts`: new. Opts back in to `password`.
- `src/auth/auth.controller.ts`: new. register / login / sign-out / me.
- `src/auth/auth.module.ts`: new. Global `JwtModule`.
- `src/app.module.ts`: changed. Imports `AuthModule`.
- `src/users/users.controller.ts`: changed. `@UseGuards` + `@ApiCookieAuth`.
- `src/main.ts`: changed. `addCookieAuth("access_token")`.
- `.env.example`: changed. `JWT_SECRET`, `JWT_TTL_DAYS`.

### API client (`packages/api-client`)

- `src/schema.d.ts`: changed, **generated only** (task 3). Never edit by hand.

### Web (`apps/web`)

- `src/services/api.ts`: changed. `TOKEN_COOKIE` and the **`onRequest` bearer middleware deleted**;
  `/auth/` exempted from the 401 branch; comment on cross-origin `credentials: "include"`.
- `src/services/cachedAPI.ts`: changed. `"Me"` tag, `getMe`, `register`/`login`/`signOut`.
- `src/helpers/functions.ts`: changed. `asMessages()` (file was empty).
- `src/containers/AuthContainer` and `MainContainer`: changed. `<Navigate replace/>` guards.
- `src/layouts/Header/Header.tsx`: changed. Sign-out via `useSignOutMutation`; **the `token &&`
  condition deleted**.
- `src/app/rootReducer.ts`: changed. `session` removed.
- `src/redux/SessionSlice/SessionSlice.ts` (whole folder): **deleted**.
- `src/routes/routes.tsx`: changed. **`isAuthed()` and the `js-cookie` import deleted**; index
  loader redirects to `rootMainPath`; real lazy pages replace the two `<h2>`.
- `src/routes/paths.ts`: changed. `component` on `signIn`, new `signUp` entry.
- `package.json`: changed. **`js-cookie` and `@types/js-cookie` deleted.**
- `CLAUDE.md`: changed. `SessionSlice` row fixed.
- `src/pages/SignIn/` (4 files): new.
- `src/pages/SignUp/` (4 files): new.
- `src/shared/InputElement`: changed. `autoComplete?`, `name?` props; `aria-invalid` +
  `aria-describedby` on the error.
- container tests: new. Test-local `createMemoryRouter`.

### Docs (`docs`)

- `06-Cross-cutting/Known-Gaps.md`: changed. **The "There is no server-side authentication" section
  deleted** (it also ships a `grep` this feature falsifies).
- `02-Architecture/Frontend.md` (line ~22): changed. `SessionSlice` reference fixed.
- `03-Features/Authorization.md`: new, from `docs/99-Templates/`.
- `03-Features/Features.md`: changed. Links to the new page.
- `journal/2026-10-19.md`: changed. Appended entry.

## Task detail

See `tasks.md` for the ordered checklist. Reasoning that is not already above:

**0.** `git switch -c feat/auth-login`. AC-14 as written is unsatisfiable: `main.ts` builds the
OpenAPI document with `ignoreGlobalPrefix: true`, so generated paths are `/auth/register` etc. (the
existing client has `"/users"`, not `"/api/users"`). AC-12 must be reworded: the OpenAPI spec _will_
contain a `password` property on the request DTOs; the criterion means responses and the hash.

**2.** `JWT_SECRET` fail-fast at module scope, never a literal fallback. One `JWT_TTL_DAYS` drives
both `expiresIn` and the cookie `maxAge`. Login needs `@HttpCode(HttpStatus.OK)` since POST defaults
to 201. Register is 201 with `@ApiCreatedResponse`.

**4-6.** `fakeBaseQuery` generic widened to `message: string | string[]`. `pnpm plop` is
interactive: hand-write the pages or use its bypass args. `ButtonElement` needs
`disabled={isLoading}` passed explicitly; `isLoading` does not imply it. Only `MainContainer`
renders `Header`, and it now guarantees authentication, which is why the `token &&` condition can
go.

## Verification

Per task: `pnpm --filter <app> typecheck` and `pnpm lint`. Task 1: `prisma migrate status`
**before** `db:migrate` (if the dev DB was ever `db push`ed, `migrate dev` offers a reset; announce
it first).

Task 2, against `pnpm --filter api dev`:

```sh
curl -i -c jar -X POST localhost:3000/api/auth/register -H 'content-type: application/json' \
  -d '{"email":"A@x.com","password":"password1"}'   # 201 + Set-Cookie HttpOnly SameSite=Lax Path=/
curl -s -X POST .../register -d '{"email":"a@x.com","password":"password1"}'   # 409 - lowercase match
curl -s -X POST .../register -d '{"email":"b@x.com","password":"short"}'       # 400 + the form's text
curl -s -X POST .../login    -d '{"email":"a@x.com","password":"wrongpass"}'   # 401
curl -s -X POST .../login    -d '{"email":"nobody@x.com","password":"wrongpass"}'  # 401, same message
curl -s localhost:3000/api/auth/me                      # 401
curl -s -b jar localhost:3000/api/auth/me               # 200 UserDto
curl -s localhost:3000/api/users                        # 401
curl -s -b jar localhost:3000/api/users | grep -c password   # MUST be 0
```

`pnpm --filter api test`: `password.spec.ts` is the repo's first API test: hash/verify round trip,
wrong password rejected, two identical passwords stored differently (AC-4). A security path does not
ship without a check.

Task 3: `grep -n '"/auth/' packages/api-client/src/schema.d.ts`, and `grep -n password` on it must
hit `LoginDto`/`RegisterDto` only, never `UserDto`.

Task 5: `git grep -nE "js-cookie|TOKEN_COOKIE|SessionSlice|session\.token"` returns nothing outside
`docs/`.

Task 8, by hand against `pnpm db:up && pnpm dev`: sign up lands on `/main` (AC-1); `document.cookie`
has no `access_token` while the Network tab shows it on `Set-Cookie` (AC-8); F5 stays signed in
(AC-7); a tampered cookie byte returns to sign-in (AC-16); **`/auth/sign-up` renders while signed
out** (the regression test for the 401-middleware bug); Sign out navigates without a full reload;
Back does not bounce. Then `pnpm typecheck && pnpm lint && pnpm test`.

## Out of scope (unchanged from the spec)

Rate limiting / brute-force lockout: a real gap, deliberately deferred. It is a separate concern
with its own dependency, and the scrypt parameters above are chosen for a world without it. Also:
email confirmation, password reset, refresh-token rotation, OAuth, roles, 2FA, CSRF tokens beyond
`SameSite=Lax`, and a `name` field in the forms. `InputElement`'s `isForgot` prop builds
`//auth/sign-in` (a protocol-relative URL pointing at host `auth`); it is not used here, so it stays
broken. A one-character `fix/` commit if you want it.

## Open questions

None. Task 0 appended the two new acceptance criteria as **AC-18** (sign-out) and **AC-19** (the
`/users` guard), after AC-17 and without renumbering anything.
