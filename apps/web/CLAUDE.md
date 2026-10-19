# apps/web — React + Vite

Dev: `pnpm --filter web dev` (port 5173). `/api/*` is proxied to the API on 3000, so fetch relative
paths only — never hardcode a host.

## Commands

- `pnpm --filter web dev` / `build` / `test` / `typecheck`
- `pnpm plop` — scaffold a component (tsx + module.scss + index.ts) into `pages`, `shared` or
  `components`
- `pnpm lint` / `pnpm lint:fix` / `pnpm format` — run from the repo root, they cover the whole
  workspace

## Structure

| Path              | What belongs there                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `src/app/`        | store, rootReducer, typed redux hooks, `App.tsx`                                            |
| `src/assets/`     | `icons/` (React components), `styles/` (global SCSS: reset, vars, mixins, main)             |
| `src/components/` | presentational components with no logic (created on demand by plop)                         |
| `src/containers/` | smart layout shells that own auth gating and `<Outlet/>` — `AuthContainer`, `MainContainer` |
| `src/helpers/`    | `functions.ts`, `hooks.ts`, `vars.ts`                                                       |
| `src/layouts/`    | `Header`, `Footer`                                                                          |
| `src/models/`     | types derived from the API contract (`*.model.ts`)                                          |
| `src/pages/`      | one folder per route                                                                        |
| `src/redux/`      | `createSlice` slices for non-API global state (none yet)                                    |
| `src/routes/`     | `paths.ts` (lazy page map) and `routes.tsx` (router tree)                                   |
| `src/services/`   | `api.ts` (the client + middleware), `cachedAPI.ts` (RTK Query)                              |
| `src/shared/`     | reusable UI primitives, each re-exported from `src/shared/index.ts`                         |
| `src/tests/`      | vitest setup                                                                                |

Component folder convention — `Name/Name.tsx`, `Name/Name.module.scss`, `Name/index.ts` (default
re-export). Use `pnpm plop` instead of writing the three by hand.

Path aliases (`@app`, `@shared`, `@services`, `@pages`, `@redux`, `@models`, `@helpers`, `@layouts`,
`@containers`, `@assets`, `@routes`) are declared in **both** `vite.config.ts` and `tsconfig.json` —
add to both or the build and the editor disagree.

## Data

- `src/services/api.ts` owns the one API client. Import `api` from there, never `createApiClient`
  from `@repo/api-client` directly — a second client misses the auth / 401 / 5xx middleware.
- Server state goes through `src/services/cachedAPI.ts` (RTK Query). Endpoints use `queryFn` calling
  `api`, so request and response types come from the OpenAPI spec. `baseQuery` is `fakeBaseQuery()`
  on purpose — do not add a real one.
- **The session is the `"Me"` cache entry, not client state.** The cookie is httpOnly, so JS cannot
  read it and there is nothing to mirror in a slice; `useGetMeQuery()` is who-am-I, and the route
  guards in `src/containers/` gate on its `isSuccess`/`isError` — never on `isLoading`, which is
  `false` on the first render.
- Endpoint missing from `api`? The API changed: `pnpm api:generate` (API must be running). Never
  widen a type to work around it.
- Model types are derived (`paths["/users"]["get"]…`), never hand-written. See
  `src/models/User.model.ts`.
- Client state goes in a slice under `src/redux/`, read with `useAppSelector` / `useAppDispatch`
  from `@app/reduxHooks` — never bare `useSelector`.
- Never import from `apps/api`.

## Rules

- Native platform before a dependency: `<dialog>`, `<details>`, `<input type="date">`, CSS Grid,
  `URLSearchParams`, `Intl`. React 19 hoists `<title>`/`<meta>` from a component, so no helmet
  library.
- SCSS modules for component styles; global classes (`container`, `card-wrap`, `table`, `flex`, …)
  live in `assets/styles/main.scss`. Check there before writing new utility CSS.
- `clsx` for conditional classes, not template strings.
- Components stay under 250 lines (oxlint enforces it). Split when a file has two reasons to change.
