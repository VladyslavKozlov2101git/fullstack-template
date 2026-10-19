# CLAUDE.md

Claude Code reads `CLAUDE.md`, not `AGENTS.md`. This wiki's rules live in `AGENTS.md` so other
agents see them too, and are imported here — **do not duplicate them in this file**.

@AGENTS.md

## Claude Code specifics

- Skills: `ingest` (process `inbox/`), `wiki-lint` (broken links, orphans, stubs).
- The code lives in the same repo: `../apps/api`, `../apps/web`, `../packages/api-client`. Check a
  page against the code rather than trusting the page.
- Heavy work — several files in `inbox/`, a full re-link pass — goes to subagents, one file or
  section each, so the main context stays small.
- Writing a page? Start from `99-Templates/`. Writing a feature page? The feature's spec in
  `../specs/` is the input, and the page is the summary that outlives it.
