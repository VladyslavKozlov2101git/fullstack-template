---
type: runbook
tags:
  - ops
---

# Deploy

> [!warning] Untested This runbook is the intended path, not a verified one — nothing has been
> deployed from this repo yet. Correct it the first time you do, and delete this callout.

## Build

```sh
pnpm install --frozen-lockfile
pnpm build            # turbo: api -> dist, web -> dist
```

`apps/api` runs with `node dist/main` and needs `DATABASE_URL` and `PORT`. `apps/web` is static
files.

## Serving

`apps/web/conf/dev.nginx` is the starting point: it serves the built SPA and reverse-proxies `/api/`
to the API, which keeps the frontend same-origin so **no CORS configuration is needed anywhere**.

That property is load-bearing. The generated client uses a relative `/api` base (see [[Frontend]]),
so if the API is ever served from another origin the assumption breaks and `VITE_API_URL` has to be
set at build time.

The config ships with CSP and the other OWASP A05 headers. Tighten the CSP once the real origins are
known.

## Migrations

```sh
pnpm --filter api prisma migrate deploy
```

`migrate deploy` only applies pending migrations. Never run `migrate dev` against a deployed
environment — it can prompt and reset. See the `prisma-migration` skill.

## Environments

Every variable the API reads is listed in `apps/api/.env.example`. Adding one without adding it
there is the usual cause of a working local build and a broken deploy.
