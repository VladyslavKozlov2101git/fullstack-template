/**
 * Who may sign in to the panel. An env var rather than a column on `User`, so
 * the feature stays off `schema.prisma` entirely — no migration, no client
 * regeneration. The cost is that changing the list needs a redeploy.
 *
 * Read per call rather than at module scope: `main.ts` calls
 * `process.loadEnvFile()` inside `bootstrap()`, which runs after every import
 * in this file has already been evaluated. A module-scope read would see no
 * `.env` at all. `session.ts` reads `JWT_TTL_DAYS` per call for the same reason.
 *
 * Fails closed: unset, empty or all-blank admits nobody.
 *
 * Both sides are case-folded. `auth.dto.ts` lower-cases email at the boundary,
 * so stored addresses are lower-case, and `Admin@X.com` in the env would
 * otherwise never match the `admin@x.com` in the database.
 */
export const isAdminEmail = (email: string): boolean => {
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.trim().toLowerCase());
};
