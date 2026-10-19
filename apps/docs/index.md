# Getting started

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up          # Postgres in Docker
pnpm db:migrate     # apply Prisma migrations
pnpm dev            # api :3000, web :5173, docs :5174
```

| App | URL |
| --- | --- |
| web | `localhost:5173` |
| api | `localhost:3000/api` |
| Swagger UI | `localhost:3000/api/docs` |
| docs | `localhost:5174` |

## Changing the API contract

The web app never hand-writes request types — see [Architecture](/architecture).
