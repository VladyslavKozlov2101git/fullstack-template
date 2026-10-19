---
type: decision
status: accepted
date: 2026-10-19
tags:
  - decision
  - architecture
---

# 0001. Types are generated from the OpenAPI spec

## Context

The API and the web app are separate builds in one repo. Any shared shape — a response body, a query
parameter — exists twice unless something forces it not to. Hand-written frontend types drift
silently: the backend renames a field, the frontend keeps compiling, and the break surfaces in
production.

## Decision

The API's OpenAPI spec is the single definition of the contract. `openapi-typescript` generates
`packages/api-client/src/schema.d.ts` from it; `openapi-fetch` turns that into a typed client. The
frontend derives every model type from `paths` and never declares a request or response shape by
hand.

The generated file is committed, so a fresh clone typechecks without a running API, and it is
deny-listed for editing in `.claude/settings.json`.

## Consequences

- A contract change fails `pnpm typecheck` in the web app, which is the point.
- Regenerating requires the API to be running (`pnpm api:generate`). That is one extra step per
  contract change and the main friction of this decision.
- Responses without `@ApiOkResponse` and DTO fields without `@ApiProperty` land in the spec as
  `any`, which quietly removes the guarantee. Hence the rules in [[Backend]] and the `nest-module`
  skill.
- RTK Query gets `fakeBaseQuery()` plus `queryFn` rather than `fetchBaseQuery`, so endpoint types
  come from the spec instead of being written again in the cache layer.

## Sources

- [[System-overview]]
