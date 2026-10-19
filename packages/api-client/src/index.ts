import createClient from "openapi-fetch";

import type { paths } from "./schema";

export type { paths, components, operations } from "./schema";
export type { Middleware } from "openapi-fetch";

/**
 * One client per app, created at the app's edge so it can attach its own
 * middleware (auth headers, 401 handling). Default baseUrl is same-origin:
 * Vite proxies /api in dev, a reverse proxy does it in prod.
 */
export const createApiClient = (baseUrl = "/api") =>
  createClient<paths>({
    baseUrl,
    // Resolve globalThis.fetch per call instead of capturing it at creation,
    // so tests can stub fetch without re-importing the module graph.
    fetch: (request) => globalThis.fetch(request),
  });
