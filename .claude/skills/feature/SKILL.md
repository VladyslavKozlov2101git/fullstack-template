---
name: feature
description: Runs the SDD cycle for a feature request — requirements analysis, codebase research, spec, plan, implementation, review. Use when handed a feature description, ticket or ТЗ to implement, when asked to start or continue a feature, or when the user types /feature. Invocation arguments name the phase: spec, plan, build or review. A bug report goes to the fix skill instead.
---

# Feature pipeline

Four phases. **Each phase is its own session** — the artifacts live in `specs/<feature>/`, so a
fresh session starts clean instead of dragging the previous phase's reasoning along. The arguments
you were invoked with name the phase; with no phase given, infer it from what already exists in the
feature folder and say which one you picked.

Three checkpoints belong to the user and are never skipped or merged: **approving the spec**,
**approving the plan**, **reviewing the PR**. Between them you work on your own.

**Small features take a short lane.** No schema change, no new endpoint, a handful of files: spec
and plan happen in one session, the user approves both at once, and there is no `plan.md` — the
approach is two or three lines at the top of `tasks.md`. Say which lane you picked and why in the
first message; the user can overrule it. Anything else takes the full four sessions.

## Who does what

| Work                                                             | Runs as                                   | Why                                                            |
| ---------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| requirements interview, architecture calls, judging agent output | you, this session                         | needs the full context and the user in the loop                |
| codebase research — what exists, what this touches               | `Explore` agent                           | read-only fan-out; you want the conclusion, not the file dumps |
| architecture pass on a non-trivial change                        | `Plan` agent                              | returns a step plan and the trade-offs                         |
| writing `spec.md` / `plan.md` / `tasks.md`                       | `doc-writer` agent (sonnet)               | mechanical once the decisions are made                         |
| hunting ambiguity in the written spec                            | `spec-critic` agent                       | clean context sees what the session that wrote it cannot       |
| diagnosing a failing test run                                    | `test-runner` agent                       | isolates the failure without burning this context              |
| review before the PR                                             | `spec-reviewer` + `reviewer`, in parallel | clean context catches what this session cannot                 |

Implementation itself stays in this session. Delegating it hides the work from the user and the diff
is the thing they are judging.

Haiku is worth it only for mechanical passes with no judgment in them (collecting a file inventory,
reformatting a list). Spec and plan writing is not that — keep `doc-writer` on sonnet.

## spec

1. Create `specs/NNN-slug/` (next free number) and save the incoming request **verbatim** as
   `request.md`. Never paraphrase the source — later phases and reviews are checked against it.
2. Send `Explore` after the ground truth: which modules this touches, what already exists that does
   part of it, which endpoints and models are in play. Give it the request, not your guesses about
   it. Pick the lane from what it finds.
3. Interview the user. Ask only questions whose answers change what gets built — use
   `AskUserQuestion`, at most four at a time, and lead with the one that would cause the most
   rework. Stop when nothing material is ambiguous, not when you run out of questions.
4. Hand `doc-writer` the request, the research, the answers and the lane; it writes `spec.md`.
5. Send `spec-critic` the feature folder — the path only, it reads the files itself. Settle each
   finding with the user: tighten the spec, move it to Open questions, or drop it as not an issue.
   Have `doc-writer` apply the result. `NO_AMBIGUITIES` means move on.
6. **Stop.** Tell the user to read the acceptance criteria and edit them. Do not start planning in
   the same session — unless this is the short lane, where `plan` follows here and both are approved
   together.

## plan

1. Read `request.md` and `spec.md`. If the spec still has open questions, resolve them with the user
   first.
2. Enter plan mode. For anything non-trivial, use the `Plan` agent; for lookups, `Explore`.
3. Decide the approach yourself, then have `doc-writer` write `plan.md` and `tasks.md`.
4. Check the first task fixes the API contract and the rest builds on it. If it doesn't, the plan is
   wrong.
5. **Stop** for approval via `ExitPlanMode`. An architecture mistake caught here is the cheapest one
   you will ever catch.

## build

1. Branch off `development` (`feat/slug`); a worktree if other features are running.
2. Work `tasks.md` top to bottom. Per task: test → implement → tick the box → commit. One task, one
   commit.
3. A task that adds behaviour starts with its test. Run it before writing the code and read the
   failure: it must fail on the assertion. A failure to compile or import means the test is broken;
   a pass means it asserts nothing — fix the test before touching the code. The contract task and
   pure wiring have nothing to fail on; they skip this.
4. Tests after every task — the Stop hook only guards typecheck and lint, tests are on you.
5. Contract task done? Backend and frontend tasks are independent from here. Say so, so the user can
   open a second session on the other side if they want.
6. Stop and ask when the spec turns out to be wrong. Do not quietly design around it.

## review

1. Run `spec-reviewer` and `reviewer` in parallel, in one message.
2. Fix what they find. A finding you disagree with goes to the user, not into the void.
3. **Run it for real.** Green tests are not a working feature. Start the app (`pnpm db:up`,
   `pnpm dev`) and exercise the three most important acceptance criteria — through the browser or
   `curl` — noting for each the AC number and what you actually observed. If something cannot be run
   here, say exactly what was left unverified.
4. Open the PR into `development` with the spec-compliance report and those observations in the
   body.

## End of every phase

Finish with this block, and nothing after it:

```md
## <phase> done — NNN-slug

**Changed** — files written, commits made (short SHA + message).

**Check before continuing** — the paths to open and what to look at in each.

**Next** — `/clear`, then `/feature <next phase> NNN-slug`
```

`/clear` is there because the next phase reads everything it needs from `specs/`; carrying this
session's context into it is what the phase split exists to avoid.

## Rules

- One feature folder per branch. `specs/` is the memory between phases — if it isn't written down,
  the next session doesn't know it.
- Only one branch at a time may change `schema.prisma` (see the `prisma-migration` skill).
- Scope that appears during build and isn't in `spec.md` is a new feature, not a bonus. Flag it;
  don't build it.
- Heavy parallel fan-out across many files is a `Workflow`, not this pipeline, and the user has to
  ask for it — it spawns many agents and bills for them.
