---
name: nest-module
description:
  Create or extend a NestJS domain module in apps/api — controller, service, DTOs with swagger
  decorators, module wiring, and the client regeneration that must follow. Use when adding an
  endpoint or a new domain concept to the API.
---

# Adding a module to apps/api

A module is one domain concept in `src/<thing>/`. Four files, no more:

```
src/bookings/
  bookings.module.ts
  bookings.controller.ts      HTTP only
  bookings.service.ts         logic + Prisma
  booking.dto.ts              request and response shapes
```

Use `src/users/` as the working reference — it is the shortest complete example in the repo.

## Order of work

1. **Schema first, if the data model moves.** Use the `prisma-migration` skill, then come back.
2. **DTOs.** Every response type gets `@ApiProperty()` on each field. Every request body and query
   gets a DTO class with `class-validator` decorators.
3. **Service.** Constructor-inject `PrismaService`. Return the DTO type. No `res`/`req` objects
   here.
4. **Controller.** One decorator per route plus `@ApiOkResponse({ type: Dto })` (add `isArray: true`
   for lists). Inject the service, call it, return. Nothing else.
5. **Module.** Declare `controllers` and `providers` (include `PrismaService`), then add the module
   to `imports` in `src/app.module.ts`.
6. **Regenerate the client.** With the API running: `pnpm api:generate`, then `pnpm typecheck`.

## What makes this go wrong

- **A response without `@ApiOkResponse`** lands in the OpenAPI spec as `any`. The frontend then
  compiles against nothing and the type safety this repo is built on is gone. This is the single
  most common miss.
- **A DTO field without `@ApiProperty()`** is absent from the spec even though it is in the
  TypeScript type.
- **An undecorated request DTO** is worse than no DTO: the global `ValidationPipe` runs with
  `whitelist: true`, so every undecorated field is stripped and the endpoint silently receives `{}`.
- **A nullable column** needs `@ApiProperty({ type: String, nullable: true })` — the plain decorator
  infers the wrong type for `string | null`.
- **Prisma in a controller** — put it in the service, always.
- **Forgetting step 6.** Typecheck passes locally in `apps/api` and the whole frontend is still on
  the old contract.

## Check it

```sh
pnpm --filter api build
pnpm --filter api dev          # then: curl localhost:3000/api/<route>
curl -s localhost:3000/api/docs-json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(Object.keys(JSON.parse(s).paths)))"
```

The route must appear in that path list. If it does not, the spec is wrong and so is the client.
