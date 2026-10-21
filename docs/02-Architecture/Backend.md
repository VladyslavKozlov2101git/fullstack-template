---
type: architecture
apps:
  - api
tags:
  - architecture
  - backend
---

# Backend — apps/api

NestJS 11 + Prisma 6 on Postgres. Owns the schema and the contract; see [[System-overview]].

All _Nest_ routes are under the `/api` prefix (`setGlobalPrefix`), Swagger UI is at `/api/docs` and the
spec at `/api/docs-json`. The spec is generated with `ignoreGlobalPrefix: true`, so paths in it are
prefix-free and the client sets its `baseUrl` to `/api` — that is why the generated client calls
`GET /users`, not `GET /api/users`.

## Layout

```
src/
  main.ts               bootstrap, global prefix, ValidationPipe, Swagger
  app.module.ts         wiring only
  prisma.service.ts     PrismaClient; connects lazily, so the API boots without a database
  health.controller.ts  GET /health
  admin/                the AdminJS panel — an Express sub-app, not a Nest controller
    admin.module.ts  admin-emails.ts  admin-resources.ts
  auth/                 session, guard, scrypt helpers
    auth.module.ts  auth.controller.ts  auth.service.ts  auth.dto.ts
    jwt-auth.guard.ts  session.ts  password.ts  current-user.decorator.ts
  users/                one domain concept per folder
    users.module.ts  users.controller.ts  users.service.ts  user.dto.ts
prisma/schema.prisma
```

`src/users/` is the reference example — the shortest complete module in the repo.

`setGlobalPrefix` covers Nest controllers only, not Express middleware, which is why
[[Admin-Panel]] serves `/admin` rather than `/api/admin` and why `main.ts` registers the body
parsers itself instead of letting Nest install them globally.

## Rules that matter

- Controllers do HTTP, services do logic, Prisma only in services.
- Every request body and query gets a DTO with `class-validator` decorators. The global
  `ValidationPipe` runs with `whitelist: true`, so an **undecorated DTO receives nothing at all** —
  this is the failure that looks like a mystery.
- Every response gets `@ApiOkResponse({ type: Dto })`, and every DTO field `@ApiProperty()`. A
  nullable column needs `@ApiProperty({ type: String, nullable: true })`.
- Never edit `prisma/migrations/**`. A wrong migration is fixed by a new migration.

Full procedures: the `nest-module` and `prisma-migration` skills.

## Features touching this app

- [[Authorization]] — `src/auth/`, the JWT cookie session, and the guard on `GET /users`.
- [[Admin-Panel]] — `src/admin/`, mounted at `/admin` outside the `/api` prefix and invisible to the
  OpenAPI document.
