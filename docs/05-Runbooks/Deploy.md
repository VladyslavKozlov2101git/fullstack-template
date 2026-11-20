---
type: runbook
tags:
  - ops
---

# Deploy

> [!warning] Untested
> This runbook is the intended path, not a verified one — nothing has been deployed from this repo yet. Correct it the first time you do, and delete this callout.

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

The config ships with CSP and the other OWASP A05 headers. Tighten the CSP once the real origins
are known.

It also carries a `location /admin` block for [[Admin-Panel]]. That block is not optional: the
panel is served by the API rather than from `root`, so without it the SPA's `try_files` catch-all
answers with `index.html` and the panel is unreachable. Two notes on it:

- **It relaxes the CSP for that path only.** AdminJS inlines two scripts in its page and loads
  Roboto from Google Fonts, so `/admin` gets `script-src 'self' 'unsafe-inline'` plus the font
  origins. Under the server-level policy the panel loads and renders blank. The SPA keeps the
  strict policy.
- **The API must trust the proxy.** `main.ts` sets `trust proxy` to one hop, which is what makes
  the panel's Secure session cookie reachable behind TLS termination and what makes its login
  limiter see real client addresses. If you put more than one proxy in front, raise it.
- **All four security headers are repeated inside the block.** nginx inherits `add_header` only
  when the current level declares none, so a block that sets just the CSP silently drops
  `nosniff`, `Referrer-Policy` and `Permissions-Policy` on exactly the path that most needs
  them. Keep them together if you edit either.

### Put an access proxy in front of /admin

The panel has its own login and a five-per-five-minutes retry limiter, but it is a full
read/write interface to the database. It should not be the only thing between the internet and
the data. Nothing in this repo can enforce this — the repo does not own the proxy — so it is a
deployment step:

1. Point a Cloudflare Tunnel (or Tailscale, or a VPN, or an nginx `allow`/`deny` list) at the
   host.
2. Add a Cloudflare Access application covering the `/admin` path, with a policy allowing only
   the identities that should reach it.
3. Confirm that a request without the Access cookie never reaches the API — check the API's own
   access log, not just the browser.

Leaving it off is a choice, not an oversight; make it knowingly.

## Migrations

```sh
pnpm --filter api prisma migrate deploy
```

`migrate deploy` only applies pending migrations. Never run `migrate dev` against a deployed
environment — it can prompt and reset. See the `prisma-migration` skill.

## Environments

Every variable the API reads is listed in `apps/api/.env.example`. Adding one without adding it
there is the usual cause of a working local build and a broken deploy.

[[Admin-Panel]] added two, and the panel refuses to work without them:

| Variable               | Effect if unset                                               |
| ---------------------- | ------------------------------------------------------------- |
| `ADMIN_EMAILS`         | the panel runs and admits nobody — fail closed, not fail open |
| `ADMIN_SESSION_SECRET` | the API refuses to boot, with a message naming the variable   |

`ADMIN_EMAILS` is a comma-separated list matched case-insensitively against `User.email`, so an
address in it must already have an account. Generate the secret the same way as `JWT_SECRET`:
`openssl rand -hex 32`.
