---
type: onboarding
tags:
  - glossary
---

# Glossary

Terms used across this vault. Link the first use on a page.

| Term                      | Means                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **the contract**          | the HTTP interface between api and web, expressed as the OpenAPI spec the API serves at `/api/docs-json`         |
| **the contract loop**     | schema → migration → DTOs → regenerate client → typecheck. The cycle in [[System-overview]]                      |
| **generated client**      | `@repo/api-client`: types produced by `openapi-typescript`, committed, never hand-edited                         |
| **DTO**                   | a class describing a request or response, decorated so it appears correctly in the OpenAPI spec                  |
| **ADR**                   | Architecture Decision Record — one numbered page in `04-Decisions/` per decision, kept even when superseded      |
| **MOC**                   | Map of Content — an index page whose job is linking, not prose. `00-Home/Index` is the top one                   |
| **spec**                  | `specs/<feature>/spec.md`: what was agreed, with numbered acceptance criteria. Not knowledge — see [[AGENTS.md]] |
| **worktree**              | a second checkout of the repo on its own branch, so parallel features do not collide                             |
| **the three checkpoints** | spec, plan, PR — the points a human must approve. See [[Workflow]]                                               |
