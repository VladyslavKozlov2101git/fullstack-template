---
name: wiki-lint
description:
  Check the docs vault for broken wikilinks, orphan pages, stubs and unresolved contradictions, then
  fix what is mechanical. Use after adding or moving pages, after an ingest run, or when asked to
  tidy the wiki.
---

# Linting the vault

```sh
pnpm docs:lint
```

The script (`scripts/docs-lint.mjs`) is the source of truth, not your reading of the files. It exits
non-zero only on broken links; everything else is a warning for you to judge.

## What each finding means

**Broken wikilink** — the target does not exist anywhere in the vault. Three real causes, and they
need different fixes:

- the page was renamed → update the link, or add the old name to the target's `aliases`
- the page was never written → write it from the right template, or remove the link if the promise
  was premature. Do not leave a link to a page you are not going to create.
- the link is an example of syntax → it belongs in backticks or a code fence, which the linter
  skips. Fix the markup, not the linter.

**Orphan** — not reachable from any page, so in practice it does not exist. Link it from the MOC it
belongs to (`00-Home/Index`, `Backend`, `Frontend`, `Journal`). If nothing should link to it, it
should not be in the vault.

**Stub** — under 200 characters of body. Either finish it or delete it. A page that only restates
its own title is worse than a missing page, because it looks answered.

**Open contradiction** — a `> [!warning] Contradiction` callout. These are deliberate and you do not
remove them; check with the human whether the question is now closed. Report them so they do not
rot.

## Then

- Fix broken links and orphans yourself — those are mechanical.
- Stubs and contradictions: report, do not resolve. They need a decision.
- Re-run until broken links are zero, then add a `lint` entry to today's journal file naming what
  you fixed.

## Do not

- Do not "fix" a finding by deleting the link and the page both — that loses the fact that something
  was supposed to exist.
- Do not loosen the linter to make a run pass.
