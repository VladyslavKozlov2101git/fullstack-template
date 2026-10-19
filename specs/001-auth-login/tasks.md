# Tasks: 001-auth-login

Why behind each task: `plan.md`. Criteria: `spec.md`.

## Rules

- One task, one commit. Message in Conventional Commits with the app as scope (enforced by
  `.githooks/commit-msg`).
- Run the tests after every task. The Stop hook guards typecheck and lint only.
- Typecheck and lint green at every task boundary.
- **Tasks 1-3 are the API contract and cannot be reordered or split.** No web file may reference the
  new `paths` entries until task 3 has regenerated `packages/api-client/src/schema.d.ts`.
- **After task 3, backend and frontend are independent.** Tasks 4-7 touch no `apps/api` file, so
  they can run in a separate session.
- If the spec turns out to be wrong, stop and ask the user. Do not quietly design around it.

## Tasks

### - [x] 0. Branch and amend the spec

Commit: `docs: amend 001-auth-login spec for sign-out and users guard`

- [x] `git switch -c feat/auth-login`
- [x] `specs/001-auth-login/spec.md`: move sign-out and the `/users` guard into scope, with new
      acceptance criteria appended after AC-17 (do not renumber)
- [x] Fix AC-14: paths are `/auth/register`, `/auth/login`, `/auth/me` (`ignoreGlobalPrefix: true`)
- [x] Reword AC-12: no _response_ and no stored value exposes the password or hash (request DTOs
      legitimately have a `password` property)
- [x] Fix the `type="password"` + `isPassword` line: pass `isPassword` alone
- [x] Add `POST /api/auth/sign-out` to the API contract table; remove sign-out from out of scope

**Verify:** `pnpm lint` (prettier covers the spec). **Satisfies:** AC-12, AC-14, AC-18, AC-19.

### - [x] 1. Schema and leak containment

Commit: `feat(api): add user password column and omit it globally`

- [x] `apps/api/prisma/schema.prisma`: `password String` on `User`
- [x] `apps/api/src/prisma.service.ts`: global `omit: { user: { password: true } }` (same commit as
      the migration, so the hash never leaks through `/users`)
- [x] `pnpm --filter api exec prisma migrate status` **before** migrating; if the dev DB was ever
      `db push`ed, `migrate dev` offers a reset: tell the user first
- [x] `pnpm db:migrate`, name `init_user_with_password` (first migration ever; creates the table)

**Verify:** `pnpm --filter api typecheck && pnpm lint && pnpm --filter api test` **Satisfies:**
AC-4, AC-12.

### - [ ] 2. The auth module

Commit: `feat(api): add auth module with httpOnly cookie session`

- [ ] `pnpm --filter api add @nestjs/jwt`
- [ ] `apps/api/src/auth/auth.dto.ts`: `LoginDto` (shape only), `RegisterDto` (`@MinLength(8)`),
      `ApiErrorDto` (`message: string | string[]` as `oneOf`); both request DTOs `@MaxLength(72)` on
      password and `@Transform` email to trimmed lowercase
- [ ] `apps/api/src/auth/password.ts`: scrypt `N=2**15, r=8, p=1, keylen=64, maxmem: 64MB`, stored
      `scrypt$N$r$p$salt$hash`, `timingSafeEqual`
- [ ] `apps/api/src/auth/password.spec.ts`: round trip, wrong password rejected, same password
      hashed twice differs
- [ ] `apps/api/src/auth/jwt-auth.guard.ts`: parse `request.headers.cookie`, exact name match on
      `access_token`, verify, look the user up by `sub` every request
- [ ] `apps/api/src/auth/current-user.decorator.ts`
- [ ] `apps/api/src/auth/auth.service.ts`: opts back in to `password` where it needs the hash; one
      identical 401 message for unknown email and wrong password
- [ ] `apps/api/src/auth/auth.controller.ts`: register (201, `@ApiCreatedResponse`), login (200,
      `@HttpCode(HttpStatus.OK)`), sign-out (204, unguarded), me (200, guarded);
      `@Res({ passthrough: true })` on register, login, sign-out; `@ApiOkResponse`/`@ApiResponse`
      with `type: ApiErrorDto` for 400/401/409
- [ ] `apps/api/src/auth/auth.module.ts`: `JwtModule.register({ global: true, ... })`; `JWT_SECRET`
      read at module scope and throws if missing (no fallback); one `JWT_TTL_DAYS` drives both
      `expiresIn` and cookie `maxAge`; cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in
      production
- [ ] `apps/api/src/app.module.ts`: import `AuthModule`
- [ ] `apps/api/src/users/users.controller.ts`: `@UseGuards(JwtAuthGuard)` + `@ApiCookieAuth`
- [ ] `apps/api/src/main.ts`: `addCookieAuth("access_token")`
- [ ] `apps/api/.env.example`: `JWT_SECRET`, `JWT_TTL_DAYS=7`; set `JWT_SECRET` in the local `.env`

**Verify:** `pnpm --filter api typecheck && pnpm lint && pnpm --filter api test`, then with
`pnpm --filter api dev` running:

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

Also check sign-out: `curl -i -X POST localhost:3000/api/auth/sign-out` returns 204 with and without
the cookie.

**Satisfies:** AC-1 (API half), AC-2, AC-3, AC-4, AC-5, AC-6, AC-9, AC-12, AC-13, AC-16, AC-17,
AC-18, AC-19.

### - [ ] 3. Regenerate the client

Commit: `chore(api-client): regenerate schema for auth endpoints`

- [ ] API running against the migrated DB, then `pnpm api:generate`
- [ ] Commit `packages/api-client/src/schema.d.ts` only. Never edit it by hand.

**Verify:** `grep -n '"/auth/' packages/api-client/src/schema.d.ts` shows register, login, sign-out,
me. `grep -n password packages/api-client/src/schema.d.ts` hits `LoginDto`/`RegisterDto` only, never
`UserDto`. Then `pnpm typecheck && pnpm lint`. **Satisfies:** AC-14, AC-12.

**Fork point: from here, tasks 4-7 touch no `apps/api` file and can run in a separate session.**

### - [ ] 4. Web plumbing

Commit: `feat(web): add auth endpoints and drop bearer middleware`

- [ ] `apps/web/src/services/api.ts`: delete `TOKEN_COOKIE` and the `onRequest` bearer middleware;
      exempt `/auth/` paths from the 401 redirect branch; one comment that a cross-origin
      `VITE_API_URL` would need `credentials: "include"`
- [ ] `apps/web/src/services/cachedAPI.ts`: `"Me"` tag; `getMe` query; `register`, `login`,
      `signOut` mutations that invalidate `"Me"`; `signOut`'s `queryFn` checks `response.ok` only
      (204 has no body); widen the `fakeBaseQuery` generic to `message: string | string[]`
- [ ] `apps/web/src/helpers/functions.ts`: `asMessages()` (string or array to `string[]`)
- [ ] Types derived from `paths[...]`; requests go through `api`

**Verify:** `pnpm --filter web typecheck && pnpm lint && pnpm --filter web test` **Satisfies:**
AC-14, AC-15, AC-16.

### - [ ] 5. Guards and delete the token cookie

Commit: `refactor(web): guard routes on /auth/me and remove token cookie`

- [ ] `AuthContainer` and `MainContainer`: render-time `<Navigate replace/>`, gating on
      `isSuccess`/`isError`, never `isLoading`; nothing rendered while uninitialised/pending
- [ ] `apps/web/src/layouts/Header/Header.tsx`: sign-out button uses `useSignOutMutation`; delete
      the `token &&` condition
- [ ] Remove `session` from `rootReducer`
- [ ] Delete `apps/web/src/redux/SessionSlice/`
- [ ] `apps/web/src/routes/routes.tsx`: delete `isAuthed()` and the `js-cookie` import; index loader
      redirects to `rootMainPath`
- [ ] `pnpm --filter web remove js-cookie @types/js-cookie`
- [ ] `apps/web/CLAUDE.md`: fix the `SessionSlice` row
- [ ] Container tests with a test-local `createMemoryRouter`: unauthenticated on a protected route
      redirects to sign-in; authenticated on an auth route redirects to `/main`

**Verify:** `pnpm --filter web typecheck && pnpm lint && pnpm --filter web test`, and
`git grep -nE "js-cookie|TOKEN_COOKIE|SessionSlice|session\.token"` returns nothing outside `docs/`.
**Satisfies:** AC-10, AC-11, AC-15, AC-16, AC-18.

### - [ ] 6. Pages and routing

Commit: `feat(web): add sign-in and sign-up pages`

- [ ] `apps/web/src/routes/paths.ts`: `component` on `signIn`, new `signUp` entry
- [ ] `apps/web/src/routes/routes.tsx`: real lazy pages replace the two `<h2>`
- [ ] `apps/web/src/pages/SignIn/` (`SignIn.tsx`, `SignIn.module.scss`, `index.ts`, test) and
      `apps/web/src/pages/SignUp/` (same four). `pnpm plop` is interactive: hand-write or use its
      bypass args
- [ ] Forms: controlled `useState`; `InputElement` with `type="email"`; password with `isPassword`
      **alone** (no `type="password"`); `ButtonElement type="submit"` with `isLoading` and an
      explicit `disabled={isLoading}`
- [ ] `apps/web/src/shared/InputElement`: add `autoComplete?` and `name?` to `InputElementProps` (do
      not extend `React.InputHTMLAttributes`); `aria-invalid` + `aria-describedby` on the error
- [ ] Error display: 409 on the sign-up email field; password-length message on the password field;
      401 message as one form-level error on sign-in; anything else as a generic form error
- [ ] Tests: form error display for 409, short password, 401

**Verify:** `pnpm --filter web typecheck && pnpm lint && pnpm --filter web test` **Satisfies:**
AC-1, AC-2, AC-3, AC-5, AC-6, AC-7 (in task 8 by hand), AC-14.

### - [ ] 7. Docs vault

Commit: `docs: document authorization and drop the no-auth known gap`

- [ ] `docs/06-Cross-cutting/Known-Gaps.md`: delete the "There is no server-side authentication"
      section, including its `grep ... UseGuards|AuthGuard|APP_GUARD` check
- [ ] `docs/02-Architecture/Frontend.md` (~line 22): fix the `SessionSlice` reference
- [ ] `docs/03-Features/Authorization.md`: new, from `docs/99-Templates/`
- [ ] `docs/03-Features/Features.md`: link to it
- [ ] `docs/journal/2026-10-19.md`: append an entry
- [ ] Follow `docs/AGENTS.md`

**Verify:** `pnpm docs:lint` (required: broken wikilinks fail `check.sh`), then `pnpm lint`.
**Satisfies:** none directly; removes the docs claim this feature makes false.

### - [ ] 8. Review and PR

No code commit unless review finds something.

- [ ] Run `spec-reviewer` and `reviewer` in parallel; fix findings, one commit each
- [ ] Manual check against `pnpm db:up && pnpm dev`:
  - sign up lands on `/main` (AC-1)
  - `document.cookie` has no `access_token`, Network tab shows it on `Set-Cookie` (AC-8)
  - F5 stays signed in (AC-7)
  - a tampered cookie byte returns to sign-in (AC-16)
  - `/auth/sign-up` renders while signed out (regression test for the 401 middleware)
  - Sign out navigates without a full reload; Back does not bounce (AC-18)
- [ ] `pnpm typecheck && pnpm lint && pnpm test`
- [ ] Open PR into `development`; the user approves it

**Verify:** `pnpm typecheck && pnpm lint && pnpm test` **Satisfies:** all, as a final pass (AC-1,
AC-7, AC-8, AC-16 by hand).
