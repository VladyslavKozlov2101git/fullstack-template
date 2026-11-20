---
tags:
  - meta
---

# 03-Features

One page per feature, end to end across the stack — not one page per app. Create it from
[[Feature|99-Templates/Feature]] and link it from [[Index]] plus the app MOCs it touches
([[Backend]], [[Frontend]]).

A feature page is written when the feature ships, out of its `specs/<feature>/` material. The spec
is the working document and stays in `specs/`; the page is the part that outlives it and answers how
this behaves, and why it is like that, six months later.

- [[Authorization]] — email + password accounts, httpOnly JWT session, route guards.
- [[Admin-Panel]] — AdminJS at `/admin`, resources generated from the Prisma schema, login gated by an `ADMIN_EMAILS` allowlist.
