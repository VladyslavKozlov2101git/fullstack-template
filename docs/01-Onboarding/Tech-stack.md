---
type: onboarding
tags:
  - stack
---

# Tech stack

Versions are what `package.json` pins; this page says _why_ each piece is here. When they disagree,
the lockfile is right and this page is stale.

## Shared

|                           |                                                                        |
| ------------------------- | ---------------------------------------------------------------------- |
| pnpm 10 workspaces        | one lockfile, strict node_modules, `workspace:*` for internal packages |
| Turborepo 2               | task graph and caching — an unchanged package is not rechecked         |
| oxlint + oxfmt + prettier | lint and format for the whole repo, configured only at the root        |
| lint-staged               | runs those on staged files from `.githooks/pre-commit`                 |

## apps/api — see [[Backend]]

NestJS 11, Prisma 6, Postgres 17, `@nestjs/swagger` for the OpenAPI spec, `class-validator` for
input. TypeScript 5.9 here, deliberately behind the frontend: decorator metadata is load-bearing in
Nest and well-proven on 5.x.

`adminjs` + `@adminjs/prisma` + `@adminjs/express` power [[Admin-Panel]], with `express`,
`express-session`, `express-formidable` and `tslib` as the express adapter's peers. This is the
one place the repo accepts a large dependency rather than writing the code: around 375 packages,
against a hand-written admin for potentially a hundred models. Two consequences to know before
touching it:

- `express` is pinned to the **exact** version `@nestjs/platform-express` uses. A caret range
  resolves to a newer 5.x and puts two copies of the framework in one process.
- 14 `@tiptap/*` packages are pinned in `pnpm-workspace.yaml`. AdminJS's design system and its
  own starter kit disagree about their versions badly enough to crash the API at boot — see
  [[Admin-Panel]].

`module` is `node20` rather than `commonjs` in `apps/api/tsconfig.json`, because AdminJS is
ESM-only and the dynamic `import()` that loads it must survive compilation.

## apps/web — see [[Frontend]]

React 19, Vite 8, TypeScript 7, Redux Toolkit + RTK Query, SCSS modules, `react-router` 8, `clsx`,
`react-hot-toast`, `react-loading-skeleton`, vitest + Testing Library.

## packages/api-client

`openapi-typescript` generates the types, `openapi-fetch` is the client. Both are the reason the
frontend cannot drift from the API — see [[0001-contract-first-openapi]].
