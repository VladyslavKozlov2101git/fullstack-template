# AGENTS.md — working rules for this wiki

This vault is the project's knowledge base. It opens in Obsidian; agents keep it current. It is the
only home for documentation — there is no separate docs site, so a fact belongs here or nowhere.

## Structure

| Folder              | Holds                                                            |
| ------------------- | ---------------------------------------------------------------- |
| `00-Home/`          | `Index.md` — the main MOC and the entry point                    |
| `01-Onboarding/`    | setup, tech stack, glossary                                      |
| `02-Architecture/`  | system overview plus one MOC per app: `Backend`, `Frontend`      |
| `03-Features/`      | one page per feature, end to end across the stack                |
| `04-Decisions/`     | ADRs: `NNNN-kebab-name.md`, numbered continuously                |
| `05-Runbooks/`      | operational instructions: deploy, environments, access           |
| `06-Cross-cutting/` | what cuts across features — workflow, auth, API conventions      |
| `99-Templates/`     | page templates — **always** start a new page from one            |
| `journal/`          | change log, one file per day                                     |
| `inbox/`            | raw incoming material, processed by the `ingest` skill           |
| `sources/`          | notes on primary sources; originals in `sources/raw/YYYY-MM-DD/` |

Specs live outside this vault, in `specs/<feature>/` — that is the SDD pipeline's working area, not
knowledge. A feature page here links to its spec; it does not copy it. Once the feature ships, the
page is what survives.

## Source priority

Sources are not equal. Top to bottom:

1. **The code** — for anything about how the system behaves _now_. It is the one source that cannot
   be out of date.
2. **An approved `specs/<feature>/spec.md`** — for what was agreed and is being built.
3. **Raw material in `sources/`** — tickets, calls, client documents. Explains _why_ a decision is
   what it is.

So a page that disagrees with the code is wrong about the present, and a page that disagrees with an
approved spec is wrong about the plan. "Wins" does not mean "silently overwrite" — see
**Contradictions**.

## Language and naming

- **Page content in English**, matching the rest of this repo. (Switching the vault to another
  language is a one-line change here — keep filenames English either way.)
- **Filenames in English**, `Title-Case-With-Hyphens.md`. ADRs: `0001-kebab-case.md`. Source notes:
  `kebab-case.md` with the date when known (`client-call-2026-07-10.md`).
- A page's H1 may differ from its filename. Put synonyms in `aliases` in the frontmatter.

## Linking rules

1. Every new page must be reachable from [[Index]] in at most two clicks — add it to the right MOC.
2. A feature page keeps these sections: Overview → User flow → Backend / Frontend → Open questions →
   Decisions → Sources.
3. **Sources link both ways**: a note in `sources/` links to the features it touches, and the
   feature's Sources section links back. Every fact must be traceable to where it came from.
4. App MOCs (`Backend`, `Frontend`) collect links to every feature that touches them. Feature
   frontmatter carries `apps: [api, web]`.
5. Link a [[Glossary]] term the first time a page uses it.
6. `[[Wikilinks]]` for anything inside the vault, markdown links only for external URLs and for
   files elsewhere in the repo (`../apps/api/src/users/users.controller.ts`).

## Journal

- One file per day: `journal/YYYY-MM-DD.md`. MOC: [[Journal]].
- **Append-only.** Add to the end of today's file; never edit or rewrite older entries.
- Entry format: `- HH:MM · {ingest|dev|lint|decision} · what changed, with wikilinks to the pages`.
- Write to it after processing the inbox, after substantive page changes during development, after a
  lint run, and after an ADR lands.

## Contradictions and staleness

- When a new source contradicts a page, **do not overwrite silently**. Add a callout:

  ```
  > [!warning] Contradiction
  > {what diverged}. Was: {…} ([[old-source]]). Now: {…} ([[new-source]]).
  ```

  and record it in the journal.

- **Who decides** follows the source priority:
  - **Code against a page** → update the page, it was describing the past.
  - **Spec against a page** → update the page and leave the callout with a link to the old source.
  - **Two sources of the same rank** → change nothing, callout plus journal, the human decides.
- Leave the callout until a human confirms the question is closed. It is the trace of a changed
  decision, not litter.

## Workflows (skills in `.claude/skills/`)

- **`ingest`** — process `inbox/`: note into `sources/`, update the affected pages, journal entry,
  original filed under `sources/raw/`. One subagent per file when there are several.
- **`wiki-lint`** — broken links, orphans, stub pages, unresolved contradictions. Runs
  `pnpm docs:lint` and interprets what it finds.

## Git discipline

- Before a session: `git pull`. After a meaningful chunk: commit with a descriptive message.
- The human reviews changes through `git diff`. That is the main quality gate here, so keep commits
  readable and never bundle a vault rewrite with code changes.
