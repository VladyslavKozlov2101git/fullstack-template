// A single segment, not "/api/admin": AdminJS derives the path set it hands its
// own frontend from the last segment of `rootPath`, so a nested root renders a
// panel whose client-side loginPath points at /admin/* while the server serves
// /api/admin/*, and every form post 404s. The cost is that nginx needs its own
// location block, which the CSP relaxation required anyway.
//
// It lives in its own file so `main.ts` can test a path without importing the
// Nest module and pulling its graph into bootstrap.
export const ADMIN_ROOT_PATH = "/admin";

/**
 * Whether a request belongs to the panel, matched the way Express actually
 * mounts it.
 *
 * Express routes case-insensitively by default — `/ADMIN/login` reaches a router
 * mounted at `/admin` — so a case-sensitive test disagrees with the mount it is
 * meant to mirror. That gap is reachable without logging in: Nest's body parser
 * would consume the request, `express-formidable` would then wait for a stream
 * that is already drained, and the connection hangs. Which is the exact failure
 * the parser exclusion in `main.ts` exists to prevent.
 *
 * Segment-exact as well, so a future `/administrator` route keeps its body
 * parsing instead of silently losing it to a prefix match.
 */
export const isAdminPath = (path: string): boolean => {
  const lower = path.toLowerCase();

  return lower === ADMIN_ROOT_PATH || lower.startsWith(`${ADMIN_ROOT_PATH}/`);
};
