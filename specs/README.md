# specs

Spec-driven-development artifacts, one folder per feature.

The folder layout inside here is whatever your SDD tool creates — run
[Spec Kit](https://github.com/github/spec-kit) (`specify init`) or
[OpenSpec](https://github.com/Fission-AI/OpenSpec) (`openspec init`) in the repo root and it will
take this directory over. Nothing else in the repo depends on the layout, so pick one and go.

Until then, one folder per feature — `specs/NNN-short-slug/` — holding three files:

| File       | Written in       | Holds                                                    |
| ---------- | ---------------- | -------------------------------------------------------- |
| `spec.md`  | the Spec session | what and why, plus numbered acceptance criteria          |
| `plan.md`  | the Plan session | how, and which files it touches                          |
| `tasks.md` | the Plan session | ordered checklist; the first task fixes the API contract |

These names are what the `spec-reviewer` agent looks for. See the
[workflow page](../docs/06-Cross-cutting/Workflow.md) for the session-per-phase cycle.
