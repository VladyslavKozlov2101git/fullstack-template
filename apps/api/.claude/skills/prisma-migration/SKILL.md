---
name: prisma-migration
description:
  Change the Prisma schema in apps/api and generate the migration safely — ordering, rebasing,
  regenerating the typed client, and the rule for parallel branches. Use whenever schema.prisma
  changes.
---

# Changing the database schema

Postgres must be up: `pnpm db:up`. `apps/api/.env` must exist (copy `.env.example`).

## The sequence

```sh
# 1. edit apps/api/prisma/schema.prisma
pnpm db:migrate --name add_booking_table   # prisma migrate dev: writes SQL + applies it + regenerates @prisma/client
pnpm api:generate                          # only after the API is running again — refreshes the OpenAPI client
pnpm typecheck                             # breaks wherever the contract moved
```

`pnpm db:migrate` already runs `prisma generate`, so `@prisma/client` types are fresh.
`pnpm api:generate` is a different thing — it refreshes `@repo/api-client` from the HTTP contract,
and it needs the API process running.

## Rules

- **Never edit a file in `prisma/migrations/`.** It has been applied somewhere. A wrong migration is
  fixed by a new migration.
- **One migration per logical change**, named for the change: `add_booking_table`, not `update`.
- **Rebase before generating.** If `development` moved, `git pull --rebase` first, then create the
  migration. Prisma orders migrations by folder timestamp, so a migration generated before a rebase
  lands _before_ someone else's and the ordering is then wrong on a fresh database.
- **Only one branch at a time may touch the schema.** Parallel features are fine as long as the
  others don't change `schema.prisma` — two branches that both do will conflict in the schema _and_
  in migration order, and the second one has to regenerate from scratch.
- **Destructive changes** (dropping a column, narrowing a type, adding a `NOT NULL` without a
  default) — prisma will warn and offer to reset. On anything with real data, write the migration
  SQL by hand in two steps: add nullable, backfill, then enforce.
- **`migrate reset` wipes the database.** Local only, and say so before running it.

## After the schema moves

A schema change is not finished when the migration applies. Walk the chain:

1. Service code that selects the changed fields.
2. The DTO that exposes them (`@ApiProperty()` — a nullable column needs
   `{ type: String, nullable: true }`).
3. `pnpm api:generate`, so the frontend's types move with it.
4. `apps/web/src/models/*.model.ts` derives from `paths`, so it follows automatically — if it
   doesn't, something was hand-written and should be fixed, not patched.

## Check it

```sh
pnpm --filter api prisma migrate status   # "Database schema is up to date"
pnpm --filter api prisma studio           # eyeball the data
```
