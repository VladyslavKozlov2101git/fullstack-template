---
name: fix
description:
  Fixes a reported bug spec-first — reproduce it, trace it to the acceptance criteria in specs/, pin
  it with a failing test, apply the smallest fix, then patch the spec if the spec let the bug
  through. Use when handed a bug report, a regression, a stack trace or "X is broken", or when the
  user types /fix. "Полагодь", "баг", "зламалось".
---

# Fix

A bug is evidence about the spec as well as the code. Either a criterion exists and the code breaks
it, or the criterion was loose enough to allow the bug, or nothing covers the case at all. The fix
lands in the code every time, and in the spec whenever the spec was part of the cause.

No phases and no separate sessions: a bug is one size, and the report is the interview.

## Steps

1. **Reproduce before touching anything.** Get to one line: _doing X, expected Y, got Z_. Ask the
   user only for what the report leaves out — at most two questions. A bug you cannot state that way
   is not ready to fix.
2. **Trace it to the spec.** Grep `specs/*/spec.md` for the domain terms in that line and find the
   closest acceptance criterion. Send `Explore` for the code path at the same time. The bug is one
   of:
   - **regression** — an AC describes the right behaviour and the code breaks it. Only the code
     changes.
   - **spec bug** — an AC exists, but a reasonable reading of it produces what you observed. The
     wording is the root cause.
   - **gap** — no AC covers it.
   - **no spec** — nothing in `specs/` owns this area. Fix the code; say so in the commit.
3. **Pin it with a failing test** at the level the behaviour lives — a unit test for a rule, a
   controller or component test for a flow. Run it and read the failure: it must fail on the
   assertion that states the expected behaviour. A bug that cannot be pinned by a test is a guess;
   stop and say so.
4. **Smallest fix that turns it green.** No drive-by refactors — anything the fix exposes goes in
   the commit body as a follow-up. Then `pnpm typecheck && pnpm lint && pnpm test`.
5. **Patch the spec** for a spec bug or a gap: tighten the AC, or add one at the end of the list
   with `<!-- added by fix, YYYY-MM-DD -->`. Never renumber. Show the user the before and after with
   `AskUserQuestion` first — an AC is a contract, not a scratchpad.
6. **Commit** on `fix/<slug>` off `development` (off `master` for a production fix — see the Git
   section of the root `CLAUDE.md`): `fix(<app>): <what was wrong>`, body = symptom → root cause →
   the test that pins it. The spec patch is its own commit.

The fix touched more than five files or crossed from `api` into `web`? Run `reviewer` before the PR.

## Rules

- Same symptom fixed before? `git log --grep` will show it. Strengthen that test rather than writing
  a second one beside it.
- Never weaken an existing test to get green. If the test is what is wrong, that is a spec question
  for the user.
- A "bug" that turns out to need new behaviour nobody specified is a feature — hand it to the
  `feature` skill.
