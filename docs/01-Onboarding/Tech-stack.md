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

## apps/web — see [[Frontend]]

React 19, Vite 8, TypeScript 7, Redux Toolkit + RTK Query, SCSS modules, `react-router` 8, `clsx`,
`react-hot-toast`, `react-loading-skeleton`, plop for component scaffolding, vitest + Testing
Library.

## packages/api-client

`openapi-typescript` generates the types, `openapi-fetch` is the client. Both are the reason the
frontend cannot drift from the API — see [[0001-contract-first-openapi]].
