# specs

Spec-driven-development artifacts, one folder per feature.

The folder layout inside here is whatever your SDD tool creates — run
[Spec Kit](https://github.com/github/spec-kit) (`specify init`) or
[OpenSpec](https://github.com/Fission-AI/OpenSpec) (`openspec init`) in the repo root and it will
take this directory over. Nothing else in the repo depends on the layout, so pick one and go.

Until then, one folder per feature — `specs/NNN-short-slug/` — holding these files:

| File         | Written in       | Holds                                                         |
| ------------ | ---------------- | ------------------------------------------------------------- |
| `request.md` | the Spec session | the original request, verbatim                                |
| `spec.md`    | the Spec session | what and why, plus numbered acceptance criteria               |
| `plan.md`    | the Plan session | how, and which files it touches — skipped for a small feature |
| `tasks.md`   | the Plan session | ordered checklist; the first task fixes the API contract      |

These names are what the `spec-reviewer` agent looks for. A bug fix adds no folder: it patches the
owning `spec.md`, marking a new criterion `<!-- added by fix, YYYY-MM-DD -->`. See the
[workflow page](../docs/06-Cross-cutting/Workflow.md) for the session-per-phase cycle.
