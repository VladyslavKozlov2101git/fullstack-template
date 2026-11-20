# Authorization: sign-in, sign-up and session

Users can create an account with email + password, sign in with the same, and stay signed in across
reloads. The API issues a JWT in an httpOnly cookie; the web app has a sign-in page, a sign-up page
and route guards that follow the session.

## Why / context

The request (`request.md`, verbatim Ukrainian): an authorization page, frontend + backend, plus user
creation, form is email + password. It is framed as an example, but the feature is treated as real.

The template ships placeholder auth scaffolding: `/auth/sign-in` and `/auth/sign-up` render a
literal `<h2>`, and a session slice holds a token that nothing issues. The API has no auth at all
and every current gate is client-side only. This feature makes it real.

## Decisions already made

| Question          | Answer                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Session transport | JWT in an httpOnly cookie set by the API. Not localStorage, not a bearer header.                                                                                   |
| Registration      | Open self-registration. Public endpoint and page. No email confirmation, no admin gating, no invite.                                                               |
| Frontend scope    | Sign-in page, sign-up page, protected-route redirect, and the Sign out button already in the header (see Scope changes).                                           |
| Guard state       | `GET /api/auth/me` called on app start; the guard waits for the answer. This pulls "current user in state" into scope (an httpOnly cookie cannot be read from JS). |
| Password rule     | Minimum 8 characters. One rule, same message on both sides. No composition rules, no breach check.                                                                 |

## Scope

| In scope                                                                    | Out of scope (reason)                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`       | Email confirmation: registration is open by decision.                                                                                                                                                                                    |
| Password hashing and JWT session cookie                                     | Password reset / forgot-password: not in the request; needs email delivery.                                                                                                                                                              |
| `password` column on `User`                                                 | Refresh-token rotation: single 7-day token is enough for now.                                                                                                                                                                            |
| Sign-in page, sign-up page (`/auth/sign-in`, `/auth/sign-up`)               | OAuth / social login: not requested.                                                                                                                                                                                                     |
| Route guards driven by `/auth/me`                                           | Roles and permissions: one kind of user.                                                                                                                                                                                                 |
| Removing the token-cookie code made obsolete by httpOnly (see Consequence)  | Rate limiting / brute-force lockout on login: a real gap, deliberately deferred, not unnecessary. A public login endpoint with no throttling is brute-forceable. Deferred only because it is a separate concern with its own dependency. |
| Regenerating `packages/api-client` so the web gets typed calls              | Account lockout: same family as rate limiting, deferred with it.                                                                                                                                                                         |
| First API test (hash/verify)                                                | 2FA: not requested.                                                                                                                                                                                                                      |
| `POST /api/auth/sign-out`, wired to the Sign out button already in `Header` | CSRF tokens: `SameSite=Lax` cookie is the only mitigation taken (see Assumptions).                                                                                                                                                       |
| `@UseGuards` on the existing `GET /api/users`                               | `name` field in the forms: the request says email + password only. `User.name` stays nullable and untouched.                                                                                                                             |

## Scope changes after approval

Two items moved into scope after this spec was first approved, both because codebase research
surfaced something the spec did not know:

- **Sign-out.** `apps/web/src/layouts/Header/Header.tsx` already renders a Sign out button that
  dispatches a local `signOut()` with no server call. Under an httpOnly cookie that button cannot
  work — the user would believe they had logged out while the session stayed alive, which on a
  shared machine is real harm. Repairing a button that already ships is not new scope. See AC-18.
- **`GET /api/users`.** It returns every user's email to anyone. Once a guard exists, closing it is
  one line, and an auth feature that leaves the only data endpoint open is half-built. See AC-19.

## Consequence of the httpOnly decision

Existing code conflicts with it. `SessionSlice.signIn` writes a JS-readable `token` cookie with
`js-cookie`, and the `onRequest` middleware in `apps/web/src/services/api.ts` reads that cookie and
sets `Authorization: Bearer`. With an httpOnly cookie the browser attaches the session itself and JS
never sees it, so both become dead code and are removed or reshaped. `SessionSlice` stops holding a
token; whether it holds the user or `/auth/me` through RTK Query is the single source is a
plan-phase call. The `onResponse` 401 handler in `api.ts` (clear state, redirect to sign-in) stays.

## Constraints on the plan

- No new dependency for what stdlib does: password hashing uses `node:crypto` (`scrypt`,
  `timingSafeEqual`), not bcrypt/argon2. JWT signing is the one justified dependency
  (`@nestjs/jwt`); no hand-rolled token format. Exact dependency list is the plan's.
- Every request body gets a DTO with `class-validator` decorators; every response gets
  `@ApiOkResponse({ type: Dto })`; every field gets `@ApiProperty()`. (`whitelist: true` strips
  undecorated fields; a missing `@ApiProperty` drops the field from OpenAPI.)
- Order: schema change, `pnpm db:migrate`, `pnpm api:generate` (API running).
- Secrets from `process.env`; new vars go in `apps/api/.env.example`: a JWT signing secret and a
  token lifetime (default 7 days).
- Web: use `api` from `src/services/api.ts`; RTK Query endpoints as `queryFn` over
  `fakeBaseQuery()`; model types derived from `paths[...]`; `clsx`; components under 250 lines; no
  new form or validation library.

## API contract

All routes under the `/api` prefix. User shape is the existing `UserDto` (`id`, `email`, `name`,
`createdAt`). No response ever contains the password or its hash.

| Method | Path                 | Request body          | Success                                                 | Errors                                                                    |
| ------ | -------------------- | --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| POST   | `/api/auth/register` | `{ email, password }` | 201, `UserDto`, sets session cookie (user is logged in) | 400 invalid email or password under 8 chars; 409 email already registered |
| POST   | `/api/auth/login`    | `{ email, password }` | 200, `UserDto`, sets session cookie                     | 400 malformed body; 401 wrong credentials                                 |
| POST   | `/api/auth/sign-out` | none                  | 204, clears the session cookie                          | none — unguarded and idempotent                                           |
| GET    | `/api/auth/me`       | none (cookie)         | 200, `UserDto`                                          | 401 no cookie, invalid or expired token                                   |
| GET    | `/api/users`         | none (cookie)         | 200, `UserDto[]` — now guarded                          | 401 no cookie, invalid or expired token                                   |

- 401 on login uses one message for wrong password and unknown email; it does not reveal whether the
  email exists.
- Register, login and sign-out are public; `me` and `users` require the cookie. Sign-out is
  unguarded on purpose: clearing a cookie is idempotent, and a 401 there is noise.
- The same password rule and message are used in the API DTO and in the form.

## Data model change

`User` gains a password-hash column (never the plaintext). Name and nullability to be fixed in the
plan; it is required for every user. `apps/api/prisma/migrations/` does not exist yet, so the first
`pnpm db:migrate` emits an initial migration creating the whole `User` table together with the new
column. Existing fields (`id`, `email` unique, `name?`, `createdAt`) are unchanged.

## Frontend

- Two pages under `src/pages/`, each in the house `Name/Name.tsx` + `Name.module.scss` + `index.ts`
  trio (scaffold with `pnpm plop`): sign-in and sign-up. Plop emits no test file; tests are
  hand-written.
- Routes `/auth/sign-in` and `/auth/sign-up` already exist in `routes.tsx` as placeholders; they are
  wired to the real pages. `paths.ts` gets the missing `component` on `signIn` and a new `signUp`
  entry.
- Forms reuse `shared/InputElement` (`type="email"` for the email field; `isPassword` **alone** for
  the password field — passing `type="password"` as well defeats the show/hide toggle, because the
  component falls back to `type` once `showPassword` flips — plus `label`, `error`) and
  `shared/ButtonElement` (`type="submit"`, `isLoading`, `disabled`).
- Guard (in the existing `AuthContainer` / `MainContainer`): waits for `/auth/me` on app start.
  Unauthenticated on a protected route redirects to `/auth/sign-in`; authenticated on an auth route
  redirects to `/main`.
- Error text from the API surfaces on the form: 409 on the email field of sign-up; the
  password-length message on the password field; the 401 message as a single form-level error on
  sign-in; other failures as a generic form error.

## Acceptance criteria

1. Submitting valid new email + password on sign-up creates a user and lands the visitor on `/main`
   signed in, without a second login step.
2. Registering an email that already exists shows an error on the email field and creates no new
   user; the API answers 409.
3. A password shorter than 8 characters is rejected by `POST /api/auth/register` with 400, and the
   sign-up form shows the same message.
4. The database holds no plaintext password: the stored value differs from the submitted password,
   and two users who chose the same password have different stored values.
5. Signing in with correct credentials lands the user on `/main` signed in.
6. Signing in with a wrong password and signing in with an unknown email return 401 with the same
   message, and the sign-in form shows that same message in both cases.
7. After signing in, a full page reload keeps the user signed in.
8. The session cookie is httpOnly: it is absent from `document.cookie` and present on the
   `Set-Cookie` header.
9. `GET /api/auth/me` returns 401 without a cookie and returns the current `UserDto` with a valid
   one.
10. An unauthenticated visit to a protected route (under `/main`) redirects to `/auth/sign-in`.
11. An authenticated visit to `/auth/sign-in` or `/auth/sign-up` redirects to `/main`.
12. No API response (register, login, me, `/users`) exposes the plaintext password or the hash, and
    no response schema in the OpenAPI spec declares either. Request bodies legitimately carry a
    `password` property; this criterion is about responses and about what is stored.
13. `POST /api/auth/register` and `POST /api/auth/login` each set the session cookie on success.
14. The regenerated `packages/api-client/src/schema.d.ts` contains `/auth/register`, `/auth/login`,
    `/auth/sign-out` and `/auth/me` — **without** the `/api` prefix, because `main.ts` builds the
    document with `ignoreGlobalPrefix: true` (the existing client has `"/users"`, not
    `"/api/users"`) — and the web code calls them through `api` with derived types.
15. The web app no longer reads or writes a JS-accessible `token` cookie or sets an `Authorization`
    header from one.
16. An expired or tampered session cookie is treated as unauthenticated (401 from `me`, redirect to
    sign-in).
17. Email is case-insensitive: an account registered as `A@x.com` can sign in as `a@x.com`, and a
    second registration of `a@x.com` returns 409.
18. Sign out ends the session: the Sign out button in the header clears the cookie server-side, the
    next `GET /api/auth/me` returns 401, and the user lands on `/auth/sign-in` by SPA navigation
    rather than a full page reload. `POST /api/auth/sign-out` without a cookie also returns 204.
19. `GET /api/users` returns 401 without a session cookie and the user list with a valid one.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm --filter api test`, `pnpm --filter web test` all green.
- `curl -s localhost:3000/api/docs-json` lists the four new paths with typed bodies and responses.
- `apps/api` has no tests yet; this feature adds the first. Minimum: a hash/verify round trip plus a
  wrong-password case. It is a security path, so it does not ship without a check.
- Web tests cover the guard redirects (AC-10, AC-11) and form error display (AC-2, AC-3, AC-6).
- Manual check of AC-7 and AC-8 in a browser against `pnpm dev`.

## Stated assumptions

- Token lifetime 7 days (env var, plan may change it).
- Cookie name: `access_token`. Set `HttpOnly`, `SameSite=Lax`, `Path=/`; `Secure` off on localhost
  and on in production.
- Dev is same-origin through the Vite proxy, so no CORS config is added. A production deploy on a
  different origin would need CORS with credentials. Risk: confirm the production topology before
  deploy.
- Email is normalised at the boundary — trimmed **and** lower-cased — so one address cannot become
  two accounts and a stray space cannot lock someone out. The column stays a plain unique string.
- Password length is capped at 128 characters as well as floored at 8. Not a second product rule:
  scrypt hashes whatever it is handed, so an unbounded field is free work for an attacker. (72 would
  be a bcrypt limit; scrypt has none.)
- A login with an unknown email is verified against a throwaway digest, so it costs the same as one
  with a known email and the response time does not reveal which it was. The digest is warmed at
  startup so the first such request does not stand out either.
- `JWT_TTL_DAYS` is validated, not merely defaulted: an empty value would otherwise mean tokens that
  expire on issue, and a non-numeric one a 500 on every sign.
- The cookie is `Secure` unless `NODE_ENV` is explicitly `development`, which is why `.env.example`
  sets it. The other default lets a deployment that forgets send session cookies in the clear
  without saying so.
- `User.name` is left null on registration.

## Open questions

None open. For the record, three came up and were settled rather than deferred:

- **Email casing** — resolved as a stated assumption (normalised at the boundary).
- **Sign-out** — initially declined, then brought **into** scope once research found the dead button
  already sitting in the header. See Scope changes and AC-18. This paragraph replaces the earlier
  "out of scope by the user's choice" wording, which contradicted the amendment.
- **Account enumeration** — login is deliberately uniform in message, status and timing, but
  `POST /auth/register` answers 409 on a taken email, so account existence is discoverable through
  the front door anyway. That is the cost of open self-registration without a challenge, and not
  something the login path can fix on its own. Tracked beside the rate-limiting gap in
  `docs/06-Cross-cutting/Known-Gaps.md`.
