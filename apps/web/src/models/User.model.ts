import type { paths } from "@repo/api-client";

/** Shapes follow the API contract — never hand-write them, derive from `paths`. */
export type USER = paths["/users"]["get"]["responses"][200]["content"]["application/json"][number];
