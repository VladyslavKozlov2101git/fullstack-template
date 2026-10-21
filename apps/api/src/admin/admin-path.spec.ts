import { isAdminPath } from "./admin-path";

describe("isAdminPath", () => {
  it.each(["/admin", "/admin/", "/admin/login", "/admin/frontend/assets/app.bundle.js"])(
    "claims %p",
    (path) => {
      expect(isAdminPath(path)).toBe(true);
    },
  );

  // Express routes case-insensitively by default, so these reach the panel. A
  // case-sensitive test here would let Nest's body parser drain the request and
  // leave express-formidable waiting on it forever — an unauthenticated hang.
  it.each(["/ADMIN/login", "/Admin/login", "/aDmIn"])(
    "claims %p, which Express also routes",
    (path) => {
      expect(isAdminPath(path)).toBe(true);
    },
  );

  // Segment-exact: a future route that merely starts with the same letters must
  // keep its body parsing.
  it.each(["/administrator", "/admin-help", "/adminx/login", "/", "/api/admin"])(
    "disclaims %p",
    (path) => {
      expect(isAdminPath(path)).toBe(false);
    },
  );
});
