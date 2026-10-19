---
name: ingest
description:
  Process raw material sitting in docs/inbox/ — a brief, a ticket, a call transcript, a client
  document — into a source note plus updates to the pages it affects. Use when the inbox is not
  empty, or when handed a document to file into the wiki.
---

# Ingesting raw material

One file at a time. Several files in the inbox means one subagent per file, so the main context
stays small; they must not write the same page concurrently, so hand out pages, not just files.

## Per file

1. **Read it in full before writing anything.** A summary written from the first page is how facts
   get invented.
2. **File the original**: move it to `sources/raw/YYYY-MM-DD/` under its own date — the date of the
   material, not today. Never edit an original.
3. **Write the source note** in `sources/`, from `99-Templates/Source.md`, named `kebab-case.md`
   with the date when it is known. Keep the source's own numbers and wording where they matter; a
   paraphrase that rounds a number is a corruption.
4. **Update the pages it affects.** Each one gets the fact _and_ a link back to the note in its
   Sources section, and the note lists the pages it touched. Both directions, always — that is what
   makes a claim traceable later.
5. **Journal it**: append to today's file with wikilinks to every page you changed.
6. Remove the file from `inbox/`. An empty inbox is the signal that everything has been read.

## When it contradicts what is already written

Do not overwrite silently. Add the callout from `AGENTS.md`:

```
> [!warning] Contradiction
> {what diverged}. Was: {…} ([[old-source]]). Now: {…} ([[new-source]]).
```

Then follow the source priority: code beats a page about the present, an approved spec beats a page
about the plan, and two sources of equal rank mean you change nothing and the human decides. Leave
the callout until a human closes it.

## When it is a feature brief

A brief is not knowledge yet — it is a request. File it as a source note for provenance, then run it
through `/feature spec`, which writes `specs/NNN-slug/request.md` verbatim and interviews the user.
The feature page in `03-Features/` is written later, when the feature ships.

## Finish

Run `pnpm docs:lint` and fix broken links before you report back. Report: what you filed, which
pages changed, which contradictions you raised, and anything you could not place.
