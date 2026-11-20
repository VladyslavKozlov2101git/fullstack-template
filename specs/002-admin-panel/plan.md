# Plan: 002-admin-panel

Read the two constraints below before touching anything.

- **Task 1 comes first and alone.** There is no API contract change in this feature, so the usual
  "first task fixes the contract" role falls to the module-mode switch: without it the ESM-only
  adapter cannot load, and it touches the whole api build and test run.
- **Base branch: `development`, but only after PR #4 lands.** The auth code this feature builds on
  (`password.ts`, `auth.dto.ts`, the `omit` in `PrismaService`, the `password` column) lives on
  `feat/page-metadata` and is not in `development` yet. The research behind this plan was done in
  that tree. See the prerequisite note in `tasks.md`.
- **Nothing here touches `schema.prisma`.** No migration, no contention for the one-branch-changes-
  schema rule.

## Context

`specs/002-admin-panel/spec.md` is approved: AdminJS mounted into the existing Nest app at `/admin`,
resources registered from Prisma DMMF, login gated by an `ADMIN_EMAILS` allowlist, the `password`
field suppressed everywhere and settable only through an explicit action.

The spec left four questions for this phase. All four are settled below, each with its reason.

## Settled open questions

**1. Prisma client instance (spec open question 1).** A new `AdminModule` lists `PrismaService` in
its own `providers`, exactly as `auth.module.ts:35` and `users.module.ts:10` do; the AdminJS options
factory receives it via `inject: [PrismaService]`. This makes a third `PrismaClient` and a third
pool. Deliberately accepted: the alternative, a global `PrismaModule`, means editing two modules
this feature otherwise does not touch. **Known ceiling**; upgrade path: introduce a global
`PrismaModule` if pool count ever matters. Marked in code with a `ponytail:` comment.

**2. CSP (open question 2).** Settled empirically by booting AdminJS 7.8.17 and reading the served
HTML.

- Login page (`<root>/login`): no script tags at all.
- Panel root: four bundles from `<root>/frontend/assets/*.bundle.js` (covered by
  `script-src 'self'`) **plus two inline `<script>` blocks** (one assigns `window.REDUX_STATE`, one
  calls `createRoot`), and it references `https://fonts.googleapis.com`.

So `script-src 'self'` renders the panel blank. The panel needs `script-src 'self' 'unsafe-inline'`,
`style-src` extended with `https://fonts.googleapis.com`, and
`font-src 'self' https://fonts.gstatic.com`. The relaxation is scoped to a `location /admin` block
only; the SPA keeps the strict server-level policy.

**3. Set-password rules (open question 3).** Reuse the already-exported `PASSWORD_MIN` (8) and
`PASSWORD_MAX` (128) from `apps/api/src/auth/auth.dto.ts`. No new constants, no new rules: the admin
cannot set a password that registration would refuse.

**4. Login timing (open question 4).** `authenticate()` always performs the user lookup with
`omit: { password: false }` and always calls
`verifyPassword(password, user?.password ?? await decoyDigest())`, then ANDs the result with
allowlist membership. This mirrors the equal-cost path at `apps/api/src/auth/auth.service.ts:52`.
Checking the allowlist first and returning early would leak by timing which addresses are admins.

## Revised during build

Four decisions in this plan turned out to be wrong once the code ran. Each is recorded as a risk in
`spec.md` and commented at the point of use in the code.

1. **`@adminjs/nestjs` is unusable here.** `admin.watch()` runs a babel bundler in-process and
   cannot resolve its own plugins under pnpm. Mounted through `@adminjs/express` and
   `HttpAdapterHost` instead, which also removed the `reflect-metadata` duplicate.
2. **`/admin` is impossible.** AdminJS builds its frontend path set from the last segment of
   `rootPath`, so a nested mount serves a panel that posts to paths the server does not serve. The
   mount is `/admin`, and nginx needs its own location block for it.
3. **`@tiptap/*` must be pinned.** `starter-kit` resolves sub-extensions that import a symbol the
   pinned core does not export, which kills the process at boot.
4. **Nest's body parser must skip the panel.** `express-formidable` hangs on an already-consumed
   stream, so `main.ts` now owns body parsing and excludes `/admin`.

## Approach

**Allowlist matching is case-insensitive on both sides.** `auth.dto.ts` lower-cases email at the
boundary via `normalizeEmail`, so stored emails are lower-case. `ADMIN_EMAILS` entries are trimmed
and lower-cased before comparison, or `Admin@X.com` would never match. Empty, unset or all-blank
`ADMIN_EMAILS` grants nobody (fail closed). The predicate is a pure function and gets a unit test.

**Two new env vars**, both in `apps/api/.env.example`: `ADMIN_EMAILS` (comma-separated) and
`ADMIN_SESSION_SECRET`. The secret is required with no fallback and throws when missing, mirroring
`JWT_SECRET` at `apps/api/src/auth/auth.module.ts:27` — which means reading it **inside the async
factory, never at module scope**. `main.ts:12-16` calls `process.loadEnvFile()` inside
`bootstrap()`, but the ES import of `AppModule` is hoisted above that call, so any env read at
module scope happens before `.env` exists and would throw even when the variable is set.

**Session cookie.** Named distinctly (not `access_token`), `path: "/admin"`, `httpOnly: true`,
`sameSite: "lax"`, `secure: process.env.NODE_ENV !== "development"`: the same secure-by-default
inversion as `apps/api/src/auth/session.ts:33`. The fields are written inline rather than exporting
the private `base()` helper from `session.ts`: exporting a helper for one caller is the larger diff.

**Adapter loading.** `@adminjs/nestjs` is loaded with a real dynamic `import()` inside the module's
async factory. That is what the `node20` module mode makes possible, hence task 1.

**Resources from DMMF.** The resource list is built by iterating Prisma DMMF, not hand-listed
(AC-6). Every resource gets `password` invisible in list/show/edit/filter plus write protection.
This is the spec's most dangerous interaction: `@adminjs/prisma` derives fields from DMMF, so
`password` exists regardless of the `omit` at `apps/api/src/prisma.service.ts:13`, and an unguarded
edit form would persist plaintext (AC-4).

**Set-password is a separate action** taking a new plaintext value, validating against
`PASSWORD_MIN`/`PASSWORD_MAX`, storing `await hashPassword(value)` (AC-5).

**nginx: restate all four security headers.** nginx inherits `add_header` from the parent level only
when the current level declares none. A `location /admin` that sets its own CSP therefore silently
drops `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`
(`apps/web/conf/dev.nginx:18-20`) for that path. The block restates all four, alongside the
`proxy_pass` and the four `proxy_set_header` lines copied from `location /api/` (:23-29). Being a
longer prefix, `location /admin` wins over `location /api/`.

**`express` is pinned exactly, not ranged.** `@adminjs/express` takes `express` as a peer
(`>=4.18.2`), and `@nestjs/platform-express` 11.2.7 pins `express` at `5.2.1`. A caret range
resolves to the newest 5.x and puts a second copy of the whole framework in one process, with the
adapter bound to one and the running app to the other. `apps/api` therefore declares
`"express": "5.2.1"`. Revisit when Nest bumps its own pin.

**File size.** `.oxlintrc.json:30` enforces `max-lines: 250`. If the AdminJS options outgrow one
file, split the resource-building code from the module wiring.

**Rejected**

- Global `PrismaModule` now: edits two untouched modules (see resolution 1).
- Exporting `base()` from `session.ts`: bigger diff for one caller.
- Allowlist check before the password check: timing leak (resolution 4).
- Hand-listed resources: the user's requirement is zero per-model maintenance.
- CSP relaxed at server level: would weaken the SPA to fix one path.

**Risky part.** Task 1. The `module` change touches the whole api build and test run, and
`password.spec.ts:55` changes behaviour once `import()` is real. Second: `password` suppression,
since a miss persists plaintext and nothing in the repo enforces it for future sensitive fields.

## Files touched

| File                                                                    | Change                                                                                                           |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `apps/api/tsconfig.json`                                                | `module: "commonjs"` to `"node20"`; remove `moduleResolution: "node"`                                            |
| `apps/api/src/auth/password.spec.ts`                                    | line 55 `await import("./password")` to static import                                                            |
| `apps/api/package.json`                                                 | add `adminjs`, `@adminjs/prisma`, `@adminjs/nestjs`, `@adminjs/express`, `express-session`, `express-formidable` |
| `apps/api/src/admin/`                                                   | new: module wiring, AdminJS options factory, allowlist predicate, DMMF resource builder, set-password action     |
| `apps/api/src/app.module.ts`                                            | import the new module                                                                                            |
| `apps/api/.env.example`                                                 | `ADMIN_EMAILS`, `ADMIN_SESSION_SECRET`                                                                           |
| `apps/web/conf/dev.nginx`                                               | new `location /admin` block                                                                                      |
| `docs/03-Features/`                                                     | new feature page from `docs/99-Templates/Feature.md`                                                             |
| `docs/03-Features/Authorization.md`                                     | `> [!warning] Contradiction` callout against its ":119 no roles"                                                 |
| `docs/03-Features/Features.md`, `docs/00-Home/Index.md`                 | link the new page (two-click rule)                                                                               |
| `docs/02-Architecture/Backend.md`                                       | add the module to the `src/` layout block and the feature list                                                   |
| `docs/01-Onboarding/Tech-stack.md`, `docs/01-Onboarding/Local-setup.md` | justify the new deps; add the panel URL                                                                          |
| `docs/05-Runbooks/Deploy.md`                                            | Cloudflare Access recipe, the `/admin` nginx note, the new env vars                                              |
| `docs/journal/2026-10-20.md`                                            | append-only entry                                                                                                |

**Not touched:** `apps/api/prisma/schema.prisma`, `packages/api-client/**`, and the existing auth
module. `pnpm api:generate` must therefore produce an unchanged `schema.d.ts` (AC-7).

## Verification

Per task: `pnpm --filter api typecheck` and `pnpm lint`. Task 1 is the gate: typecheck, test, build,
boot, `/api/docs-json` responds, and `git diff --exit-code packages/api-client/src/schema.d.ts`
after `pnpm api:generate`. Task 4's AC-4 check is concrete: read a user's stored digest, edit `name`
through the panel, re-read, byte-identical.

## Out of scope (unchanged from the spec)

Any deploy path, a `role` column or RBAC, any admin UI in `apps/web`, per-model permission tiers,
audit logging, 2FA, SSO, and enforcing Cloudflare Access in code.

Rate limiting moved **into** scope during the build: `@adminjs/express` ships a limiter, so the
login sets `maxRetries` at no dependency cost. That widens the feature rather than narrowing it, and
it is recorded in `spec.md`.

## Open questions

None. The spec's four are resolved above.
