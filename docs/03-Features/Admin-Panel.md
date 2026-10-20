---
type: feature
status: shipped
apps:
  - api
spec: "specs/002-admin-panel/spec.md"
aliases:
  - AdminJS
  - Admin
tags:
  - feature
  - admin
---

# Admin Panel

> A deployed, password-protected interface for reading and editing database rows, generated from the
> Prisma schema rather than hand-written — so adding a model costs no admin code at all.

## Overview

The ask was a Django-style admin: look at user rows and change them on a real environment, not only
locally. The important thing it is _not_ is "a UI for the database". Django's admin lives inside the
application and reuses its validation and `set_password()`; a tool that talks straight to Postgres
cannot. That matters here because `User.password` is a scrypt digest (see [[Authorization]]) — type
a string into that column by hand and the account can never log in again.

Four options were weighed: a hand-written page in `apps/web`, AdminJS inside the API, a
Directus/NocoDB container beside Postgres, and Prisma Studio behind an access proxy. The deciding
constraint was the number of models: potentially around a hundred, and no appetite for maintaining
admin screens. That rules out the hand-written page and the raw-database tools, and leaves AdminJS,
which generates its screens from the schema and runs inside the app, so it can reuse the existing
scrypt helpers.

Three things decide how the rest of this page reads:

1. **Nothing here touches `schema.prisma`.** Who counts as an admin comes from an `ADMIN_EMAILS`
   environment variable, not a `role` column, so the feature needs no migration and no client
   regeneration. The cost is that changing the list means redeploying a variable.
2. **The panel has its own session, separate from the app's.** It never shares the `access_token`
   cookie, and the auth module, guard and JWT payload were not touched.
3. **AdminJS fought the setup at almost every step.** Five of the plan's decisions turned out to be
   impossible as written. They are recorded under [[#Deliberate oddities]] because each one looks
   arbitrary without its reason.

## User flow

- **Open `/admin`** on any environment where it is deployed. The panel redirects to `/admin/login`.
- **Sign in** with an email that is listed in `ADMIN_EMAILS` and that account's own password. An
  address that is not on the list is refused even when the password is right, and the refusal costs
  the same as a correct one so the panel does not reveal who its admins are.
- **Browse and edit** any model in the schema. For `User` that means listing rows and changing
  `email` and `name`; the digest appears in no view.
- **Set someone's password** with the write-only `New password` field on the edit form. It is hashed
  with the same scrypt helper the real login verifies against, so the person can sign in with it
  immediately. Leaving the field blank changes nothing.
- **Creating a user is closed** in the panel. Accounts are created by `POST /auth/register`, which
  hashes. See [[#Deliberate oddities]].
- **Five wrong passwords in five minutes** stop further attempts from that address for the rest of
  the window.

## Backend

See [[Backend]]. Module: `../../apps/api/src/admin/`.

| Path                           | Serves                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `/admin`                       | redirects to the login page                                |
| `/admin/login`                 | the panel's own login form, with a 5-per-5-minutes limiter |
| `/admin/frontend/assets/*`     | the panel's prebuilt bundles, fonts and icons              |
| `/admin/api/resources/<Model>` | the panel's own JSON API, session-protected                |

It is an Express sub-application mounted onto Nest's adapter in `onModuleInit`, not a Nest
controller. Two consequences worth knowing: `setGlobalPrefix("api")` does not apply to it, which is
why the path is spelled out in full; and `SwaggerModule` cannot see it, so **nothing about the panel
enters the OpenAPI document** and `pnpm api:generate` produces a byte-identical client. The panel is
deliberately outside the contract that [[0001-contract-first-openapi]] governs.

Resources come from `Prisma.dmmf.datamodel.models` — the same source `@adminjs/prisma`'s own
`getModelByName` reads — so a new model in the schema appears in the panel with no code change.

### Deliberate oddities

Each of these looks arbitrary and is not. Most were found by running the thing, not by reading it.

- **The panel is at `/admin`, not under `/api`.** `/api/admin` was the plan, because
  `apps/web/conf/dev.nginx` proxies only `location /api/` and that needed no nginx change. AdminJS
  cannot do it: it derives the path set it hands its own frontend from the **last segment** of
  `rootPath`, so a nested root serves a panel whose client-side `loginPath` points at `/admin/login`
  while the server serves `/api/admin/login`, and every form post 404s. Overriding `loginPath` and
  `logoutPath` fixes the server routes and not the frontend state. nginx got its own
  `location /admin` block instead, which the CSP relaxation below required anyway.
- **`@adminjs/express`, not the official `@adminjs/nestjs`.** The Nest adapter calls
  `admin.watch()` unconditionally, which starts a rollup + babel bundler for custom components
  inside the API process. There are no custom components to build, and it dies regardless: babel
  resolves plugin names from the compilation root rather than from `adminjs`'s own dependencies, so
  under pnpm's isolation it cannot find `@babel/plugin-syntax-import-assertions`. Making it work
  would mean adding that plugin plus three presets to this app to feed a dev-mode watcher nobody
  wants in production. The adapter's only other job was one `app.use()`.
- **`module: "node20"` in `apps/api/tsconfig.json`.** AdminJS 7 is ESM-only and
  `@adminjs/express`'s exports map declares no `require` condition. Under `module: "commonjs"`
  TypeScript rewrites `await import()` into `require()` and the app dies at boot. `node20` keeps the
  dynamic import real while the output stays CommonJS, since `apps/api` has no `"type"` field.
  `moduleResolution: "node"` had to go with it — TypeScript rejects the pair — and `isolatedModules`
  followed ts-jest's own warning.
- **14 `@tiptap/*` packages are pinned in `pnpm-workspace.yaml`.** `@adminjs/design-system` pins
  every tiptap package it names at 2.1.13, but `@tiptap/starter-kit` pulls its sub-extensions with
  caret ranges that resolve to 2.27.x. Those import `canInsertNode`, which 2.1.13 does not export,
  and the process dies at boot with a `SyntaxError`. Not a warning — a crash.
- **The panel's own assets are re-registered before AdminJS's.** AdminJS serves its bundles with a
  bare `res.sendFile`, whose default is `dotfiles: "ignore"`. pnpm keeps every package under
  `node_modules/.pnpm`, so every asset path contains a dot-segment, every bundle 404s, and **the
  panel renders blank with nothing logged anywhere**. The same assets registered first with
  `dotfiles: "allow"` take precedence. A flat `node_modules` never hits this, which is why upstream
  has not.
- **`main.ts` owns body parsing and skips `/admin`.** AdminJS parses its form posts with
  `express-formidable`, which waits forever on a request stream Nest's parser has already consumed —
  so the login POST hung with no error at all. The app is created with `bodyParser: false` and
  registers json and urlencoded itself, excluding the panel's path. `@adminjs/express` has a guard
  for exactly this condition and it does not work: it calls `next(err)` and then `next()`
  unconditionally, so the chain reaches formidable anyway.
- **Setting a password is a field on the edit form, not its own action.** An AdminJS action with its
  own input needs a custom React component, and bundling components is the wall described above. A
  virtual `newPassword` property is AdminJS's own recipe for this and needs no component, so the
  panel runs on nothing but prebuilt bundles.
- **The digest is suppressed in two layers.** `isVisible: false` only keeps a field out of the
  rendered form; AdminJS still forwards an arbitrary request body down to the adapter, and
  `@adminjs/prisma` builds its field list from the DMMF rather than from the `omit` in
  `prisma.service.ts`. So a `before` hook deletes the suppressed keys from every create and edit
  payload. Without it a hand-made POST writes a plaintext password and locks that account out of
  login permanently. There is a test for precisely that request.
- **Creating a row is closed on any model whose suppressed field is required with no default.** Such
  a row could only ever fail at the database, so the action answers `ForbiddenError` rather than
  offering a form that cannot work.
- **A third `PrismaClient`, and so a third connection pool.** `PrismaService` is listed in each
  module's `providers` in this repo rather than provided globally, and this module follows the
  existing pattern. Marked with a `ponytail:` comment; the upgrade path is one `@Global()`
  `PrismaModule`, which means editing two modules this feature otherwise does not touch.

## Frontend

Nothing. The panel ships its own React application, and `apps/web` is untouched — no route, no
component, no entry in the generated client. The only file outside `apps/api` that this feature
changes is `apps/web/conf/dev.nginx`, which is server configuration rather than frontend code.

That block is not optional. The panel is served by the API, so without a `location /admin` the SPA's
`try_files` catch-all hands out `index.html` and the panel is unreachable once deployed. The block
also relaxes the CSP for that path only — see [[Deploy]] for what and why.

## Open questions

- [ ] **The panel is as exposed as whatever sits in front of it.** It has its own login and a retry
      limiter, but it is a full read/write interface to the database and should not be the only thing
      between the internet and the data. The `location /admin` block carries a note to put an access
      proxy ahead of it; nothing in the repo can enforce a proxy it does not own. See [[Deploy]].
- [ ] **Suppressing a future sensitive field is discipline, not a check.** One `SECRET_FIELDS` set
      covers every model that has a listed name, but a new secret column with a different name is
      exposed until somebody adds it. There is no hook or lint rule for this. Tracked in
      [[Known-Gaps]].
- [ ] **`tinymce <= 7.9.2` arrives with AdminJS**, carrying five XSS advisories, plus
      `uuid < 11.1.1`. Measured against the baseline — the repo already had two production
      advisories before this feature — and accepted: `User` holds only scalar fields, so no
      rich-text editor is ever instantiated, and the panel sits behind a login. `npm audit fix
--force` would downgrade AdminJS to 6.8.7, which is not an option.
- [ ] **Adding or removing an admin needs a redeploy**, because the allowlist is an environment
      variable. The alternative is a `role` column and the migration that comes with it.
- [ ] **The deploy path itself does not exist.** There is no Dockerfile, no CI and no hosting target
      in this repo, so the half of the original request that said "on live" cannot be exercised yet.
      Explicitly out of scope in the spec, not forgotten. See [[Known-Gaps]] and [[Deploy]].

## Decisions

- [[0001-contract-first-openapi]] — the panel is a deliberate exception: it is invisible to the
  OpenAPI document, so it neither extends nor breaks the generated contract.
- [[0003-hooks-enforce-not-prose]] — the staged-credential scan in `.githooks` stopped this work
  twice over a test fixture that read like a hardcoded password. Both were false positives and the
  code was rewritten rather than the hook bypassed.

## Sources

- `../../specs/002-admin-panel/spec.md` — the approved spec and its 12 acceptance criteria
- `../../specs/002-admin-panel/plan.md` — the approach, and the four decisions the build revised
- `../../specs/002-admin-panel/request.md` — the request, verbatim
