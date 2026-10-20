# Tasks: 002-admin-panel

Why behind each task: `plan.md`. Criteria: `spec.md`.

## Rules

- One task, one commit. Message in Conventional Commits with the app as scope (enforced by
  `.githooks/commit-msg`).
- Run the tests after every task. The Stop hook guards typecheck and lint only.
- Typecheck and lint green at every task boundary.
- **Task 1 comes first and alone.** No API contract changes here, so it plays the foundation role:
  everything else depends on the adapter being loadable.
- **Parallel:** tasks 1-5 are backend-only and sequential. Task 6 (nginx) touches no `apps/api` file
  and can run in a separate session once task 3 lands. Task 7 (docs) is independent of code but
  describes it, so write it last.
- If the spec turns out to be wrong, stop and ask the user. Do not quietly design around it.

## Tasks

### - [x] 1. Module-mode switch (backend-only)

Commit: `chore(api): switch to node20 module resolution`

- [x] `apps/api/tsconfig.json`: `module` to `node20`; drop `moduleResolution: "node"`
- [x] `apps/api/src/auth/password.spec.ts:55`: replace `await import("./password")` with a static
      import (the decoy-not-cached assertion does not need a dynamic import)
- [x] `isolatedModules: true` added: ts-jest warns that a hybrid module kind is only supported with
      it. Unplanned fallout of this task, not scope creep

**Verify:** `pnpm --filter api typecheck`; `pnpm --filter api test` (both existing spec files green,
incl. the digest-parameter assertion at `password.spec.ts:32`); `pnpm --filter api build`; boot the
api, confirm `/api/docs-json` responds; `pnpm api:generate` then
`git diff --exit-code packages/api-client/src/schema.d.ts`. **Satisfies:** AC-7, AC-8, AC-9.

### - [x] 2. Dependencies (backend-only)

Commit: `chore(api): add adminjs and its express adapter`

- [x] `pnpm --filter api add adminjs @adminjs/prisma @adminjs/nestjs @adminjs/express express-session express-formidable`
- `@adminjs/express` and `express-session` are required by the Nest adapter's Express loader and are
  not installed transitively. Adds roughly 500 packages: an accepted cost recorded in the spec.
- [x] `express`, `express-formidable` and `tslib` added too: all three are peers of
      `@adminjs/express`, which has no dependencies of its own
- [x] `express` pinned to exactly `5.2.1` to match Nest, after a caret range produced two copies of
      express in one process. Actual growth was +375 packages, not ~500

**Verify:** the api still boots; `pnpm --filter api typecheck`. **Satisfies:** supports AC-8.

### - [x] 3. Mount and login (backend-only)

Commit: `feat(api): mount a protected adminjs panel at /api/admin`

- [x] `apps/api/src/admin/`: module; options factory loading `@adminjs/nestjs` via real dynamic
      `import()`, `rootPath: "/api/admin"`, `inject: [PrismaService]` with a `ponytail:` comment on
      the third-pool ceiling
- [x] `authenticate()`: lookup with `omit: { password: false }`, always
      `verifyPassword(password, user?.password ?? await decoyDigest())`, AND allowlist membership
- [x] Allowlist predicate: entries trimmed and lower-cased, email lower-cased, empty/unset/blank
      grants nobody
- [x] Session cookie: distinct name, `path: "/api/admin"`, `httpOnly`, `sameSite: "lax"`,
      `secure: process.env.NODE_ENV !== "development"`, written inline
- [x] `ADMIN_SESSION_SECRET` read **inside the async factory**, not at module scope, and throws
      there if missing. `main.ts` calls `process.loadEnvFile()` inside `bootstrap()`, while the ES
      import of `AppModule` is hoisted above it, so a module-scope read runs before `.env` is loaded
      and throws even when the var is set. `auth.module.ts:27` reads `JWT_SECRET` inside
      `useFactory` for this reason
- [x] `apps/api/.env.example`: `ADMIN_EMAILS`, `ADMIN_SESSION_SECRET`; set both in the local `.env`
- [x] `apps/api/src/app.module.ts`: import the module
- [x] One `*.spec.ts` for the allowlist predicate: empty/unset env grants nobody, entries trimmed
      and case-folded, a non-listed address refused

Deviations from the plan, all forced by what the code did:

- [x] Mounted via `@adminjs/express` and `HttpAdapterHost`, not `@adminjs/nestjs`, whose
      `admin.watch()` cannot bundle under pnpm; `@adminjs/nestjs` removed from the dependencies
- [x] Root path is `/admin`, not `/api/admin`: AdminJS cannot serve a nested root correctly
- [x] 14 `@tiptap/*` packages pinned to 2.1.13 in `pnpm-workspace.yaml`, or the process dies at boot
- [x] Panel assets re-registered with `dotfiles: "allow"`, since pnpm's `.pnpm` directory makes
      `res.sendFile` 404 every bundle and the page renders blank
- [x] `main.ts`: `bodyParser: false` plus json and urlencoded that skip `/admin`, or the login POST
      hangs forever
- [x] `maxRetries: { count: 5, duration: 300 }` on the login, which closes the rate-limiting risk
      the spec recorded

**Verify:** tests and typecheck green; by hand, every case confirmed: `/admin` serves the login page
and all five frontend bundles return 200; a listed email with the right password gets in; a listed
email with a wrong password does not; an unlisted email with the right password does not; unset
`ADMIN_EMAILS` admits nobody. **Satisfies:** AC-1, AC-2, AC-11.

### - [x] 4. Resources from DMMF, `password` suppressed (backend-only)

Commit: `feat(api): register admin resources from the prisma schema`

- [x] Build the resource list by iterating Prisma DMMF, not a hand-kept list; split into its own
      file if the options file nears `max-lines: 250`
- [x] `password` invisible in list/show/edit/filter and write-protected on every resource

- [x] `isVisible: false` is not enough on its own: AdminJS forwards an arbitrary request body to the
      adapter, so a `before` hook on edit and new drops the suppressed keys from the payload.
      Without it a hand-made POST writes a plaintext password and locks the account out of login
- [x] Create is closed on any model whose suppressed field is required with no default, since it
      could only ever fail at the database. Users are created by POST /api/auth/register
- [x] One regression test (`admin-resources.spec.ts`): the list matches the DMMF model list, the
      digest is hidden, a smuggled password is dropped, and create is closed

**Verify (AC-4):** read the stored digest for a user, edit that user's `name` through the panel,
re-read the digest, confirm it is byte-identical. Confirm `password` appears in no view. Confirmed
by hand against Postgres: the record params are `id, email, name, createdAt` with no `password`; an
edit carrying `password=totally-plaintext-pwned` changed `name` and left the digest byte-identical
and still in `scrypt### - [x] 4. Resources from DMMF, `password` suppressed (backend-only)

Commit: `feat(api): register admin resources from the prisma schema`

- [x] Build the resource list by iterating Prisma DMMF, not a hand-kept list; split into its own
      file if the options file nears `max-lines: 250`
- [x] `password` invisible in list/show/edit/filter and write-protected on every resource

- [x] `isVisible: false` is not enough on its own: AdminJS forwards an arbitrary request body to the
      adapter, so a `before` hook on edit and new drops the suppressed keys from the payload.
      Without it a hand-made POST writes a plaintext password and locks the account out of login
- [x] Create is closed on any model whose suppressed field is required with no default, since it
      could only ever fail at the database. Users are created by POST /api/auth/register
- [x] One regression test (`admin-resources.spec.ts`): the list matches the DMMF model list, the
      digest is hidden, a smuggled password is dropped, and create is closed

**Verify (AC-4):** read the stored digest for a user, edit that user's `name` through the panel,
re-read the digest, confirm it is byte-identical. Confirm `password` appears in no view. form; the
edited user still signs in through `POST /api/auth/login`; create answers `ForbiddenError` and
writes no row; delete works. Note `isAccessible: false` answers HTTP 200 with an error body rather
than 403 — that is AdminJS's JSON-API convention, not a failure. **Satisfies:** AC-3, AC-4, AC-6.

### - [ ] 5. Set-password action (backend-only)

Commit: `feat(api): add a set-password action to the admin panel`

- [ ] Separate explicit action taking a new plaintext value
- [ ] Validate against `PASSWORD_MIN`/`PASSWORD_MAX` imported from `apps/api/src/auth/auth.dto.ts`
- [ ] Store `await hashPassword(value)`

**Verify:** after using it, the stored value matches `scrypt$N$r$p$salt$digest` and the user can
sign in through `POST /api/auth/login` with the new password. **Satisfies:** AC-5.

### - [ ] 6. nginx CSP block (frontend-side config; no `apps/api` file)

Commit: `fix(web): allow the admin panel through the CSP`

- [ ] `apps/web/conf/dev.nginx`: add `location /admin/` with `proxy_pass` and the four
      `proxy_set_header` lines copied from `location /api/`
- [ ] Restate all four security headers in the block (nginx drops inherited `add_header` when a
      level declares its own)
- [ ] CSP relaxed exactly as far as needed: `script-src 'self' 'unsafe-inline'`, `style-src` plus
      `https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com`; comment why,
      referencing the inline `REDUX_STATE`/`createRoot` scripts

**Verify:** with the config applied the panel renders rather than appearing blank, and the SPA's own
responses still carry the strict `script-src 'self'`. **Satisfies:** AC-10.

### - [ ] 7. Docs

Commit: `docs: document the admin panel`

- [ ] `docs/03-Features/`: new feature page from `docs/99-Templates/Feature.md`, exact sections kept
      (Overview, User flow, Backend / Frontend, Open questions, Decisions, Sources)
- [ ] Link it from `[[Index]]` and the Features MOC
- [ ] `docs/03-Features/Authorization.md`: `> [!warning] Contradiction` callout against its "no
      roles" line
- [ ] `docs/05-Runbooks/Deploy.md`: Cloudflare Access recipe, `/api/admin` reachability note, the
      two new env vars, and the CSP justification
- [ ] `docs/02-Architecture/Backend.md`: module in the `src/` layout block and feature list
- [ ] `docs/01-Onboarding/Tech-stack.md`: justify the deps; `Local-setup.md`: panel URL
- [ ] `docs/journal/2026-10-20.md`: append `- HH:MM · {ingest|dev|lint|decision} · …`
- [ ] Follow `docs/AGENTS.md`: wikilinks inside the vault, markdown links for files outside it

**Verify:** `pnpm docs:lint` (broken wikilinks fail the run), then `pnpm lint`. **Satisfies:**
AC-12.

### - [ ] 8. Review and PR

No code commit unless review finds something.

- [ ] Run `spec-reviewer` and `reviewer` in parallel; fix findings, one commit each
- [ ] `pnpm lint && pnpm typecheck && pnpm test`
- [ ] Open PR into `development`; the user's approval is the remaining checkpoint

**Verify:** `pnpm lint && pnpm typecheck && pnpm test`. **Satisfies:** all, as a final pass (AC-9).

## Notes

**Prerequisite — this blocks task 1.** Branch `feat/admin-panel` off `development` only once PR #4
(`feat/page-metadata`) has landed. Until then `development` has no auth at all: no `auth/`
directory, no `password.ts`, no `PASSWORD_MIN`, no `omit` in `PrismaService`, and no `password`
column on `User`. Every fact in `spec.md` and `plan.md` was researched in the `feat/page-metadata`
tree, so it is accurate for that tree and not for `development`. AC-2, AC-4 and AC-5 are meaningless
without that auth code. When re-checking a base branch, run `git log development..HEAD` before
trusting what the working tree shows.

Tests are run per task by hand because the Stop hook deliberately skips them. Nothing here touches
`schema.prisma`, so this branch does not contend for the one-branch-changes-the-schema rule.
