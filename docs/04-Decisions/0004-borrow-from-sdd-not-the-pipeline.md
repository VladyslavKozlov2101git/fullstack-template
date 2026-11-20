---
type: decision
status: accepted
date: "2026-11-20"
tags:
  - decision
  - process
  - agents
---

# 0004. Borrow five practices from genkovich/sdd, not the pipeline

## Context

[genkovich/sdd](https://github.com/genkovich/sdd) (v2.4.1) is a Claude Code plugin for
spec-driven development: 23 skills, 10 agents and 15 shared contract files, about 12k lines of
prompt. Its backbone is specify → clarify → ux-flows → design → sequences → data-model → api →
screens → tasks → plan-tests → implement → review → ship, each stage gated on the previous one's
file, plus utilities (`fix`, `glossary`, `classify-size`, `roadmap`, `config`). This repo already
runs its own four-phase cycle ([[Workflow]]). The question was what that plugin does better.

**Where sdd is stronger**

- A clean-context devil's-advocate reads the written spec and asks where two engineers would build
  different things. Ours had only the interview — run by the same session that writes the spec.
- A coverage floor for acceptance criteria: happy path, error, authorization, invariant,
  cross-context. Ours had none, and it shows: the first auth spec here left the API unguarded and
  only the post-build review caught it ([[Known-Gaps]]).
- Sizing with a fast lane: XS/S work skips stages that do not apply. Ours ran four sessions for
  everything.
- A bug entry point that treats a bug as evidence about the spec: regression, spec bug or gap,
  pinned by a failing test first. Ours said "use judgement".
- `ship` runs the feature and records what it observed per criterion. Ours stopped at green tests
  and reviewers; the auth routes were checked by hand with `curl`, unrecorded.
- Test-first with the first failure classified — a test that fails to compile or passes at once is
  rejected before any code is written.
- A fixed end-of-stage block: what changed, which files to check, the exact next command.
- Evals for the skills themselves (scenario + rubric + judge).

**Where this repo is stronger, or sdd does not fit it**

- **Enforcement.** sdd is prose only — every "hard refuse" is an instruction the model may skip. Here
  hooks and permissions enforce what must not slip ([[0003-hooks-enforce-not-prose]]).
- **The verbatim `request.md`.** sdd has no raw-request anchor to check the spec against.
- **Stack fit.** sdd's `api` writes `openapi.yaml` by hand and `data-model` writes raw SQL
  migrations; here the contract is generated from the Nest code ([[0001-contract-first-openapi]])
  and migrations come from Prisma. Those stages would fight the stack, not help it.
- **Its commits break ours.** sdd commits every document separately as `specify: <slug> spec.md`;
  `.githooks/commit-msg` rejects that, and it contradicts one logical change per commit.
- **Cost of context.** Each sdd stage loads its skill plus several shared files; a feature walks
  thirteen stages. Most of it — Arc42 SAD, C4, sequence diagrams, screen manifests, `tasks.json`
  DAGs, agent-team and workflow execution modes, a settings file with 25 keys, Codex/Cursor
  adapters — serves teams and stacks this template does not have.
- **Memory.** `spec-reviewer` keeps project memory across features; sdd agents start from zero.

## Decision

Take the practices, not the pipeline:

1. `spec-critic` agent — clean-context ambiguity hunt in the spec phase, settled before approval.
2. Coverage floor in `doc-writer` — happy, failure, authorization, invariant, or `N/A — reason`.
3. A short lane in the `feature` skill — no schema change, no new endpoint: one session, one
   approval, no `plan.md`.
4. A `fix` skill — reproduce, trace to an AC, failing test, smallest fix, patch the spec.
5. In `feature`: test-first for behaviour tasks, a run-it-for-real step before the PR with the
   observations in the PR body, and one end-of-phase block.

Not taken: the design/sequences/data-model/api/screens/ux-flows stages, `.size`/`.route` files,
the settings file and depth dials, per-document commits, `tasks.json` with execution modes,
`roadmap`/`interview`/`survey` (the vault and [[System-overview]] already map the code), and evals
— worth building only if these skills grow past what one person can eyeball.

## Consequences

- The spec phase costs one more agent call, on opus, per feature. Cheaper than one AC missed until
  review.
- The short lane trades a separate plan approval for speed. Picking the lane is a judgement call
  the user can overrule; a wrong call costs at most a schema change discovered mid-build, which the
  `prisma-migration` skill still catches.
- All five additions are prose, so they are advice, not enforcement — the weaker kind of guarantee
  [[0003-hooks-enforce-not-prose]] warns about. If one of them gets skipped twice, it becomes a hook.

## Sources

- [genkovich/sdd](https://github.com/genkovich/sdd), read at v2.4.1 on 2026-11-20
- [[Workflow]] · [[Known-Gaps]]
