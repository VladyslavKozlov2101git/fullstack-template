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

All routes are under the `/api` prefix (`setGlobalPrefix`), Swagger UI is at `/api/docs` and the
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
  users/                one domain concept per folder
    users.module.ts  users.controller.ts  users.service.ts  user.dto.ts
prisma/schema.prisma
```

`src/users/` is the reference example — the shortest complete module in the repo.

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
