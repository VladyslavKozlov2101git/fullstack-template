# apps/web — React + Vite

Dev: `pnpm --filter web dev` (port 5173). `/api/*` is proxied to the API on 3000, so fetch relative paths only.

## Commands

`pnpm --filter web dev` / `build` / `test` / `typecheck`

## Rules

- All API calls go through `api` from `@app/api-client`. No bare `fetch` to the backend, no hand-written request/response types — the client is generated from the OpenAPI spec and is the single source of truth.
- Endpoint missing from the client? The API changed: regenerate with `pnpm --filter @app/api-client generate`. Don't widen a type to work around it.
- Never import from `apps/api`.
- Native platform before a dependency: `<dialog>`, `<details>`, `<input type="date">`, CSS Grid, `URLSearchParams`, `Intl`. No UI kit, state manager, form library or date library unless the feature genuinely needs it.
- Component files are PascalCase and colocated with what they use. Split a file when it has two reasons to change, not at a line count.
