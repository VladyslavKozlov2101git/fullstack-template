import { components } from "@repo/api-client";

// Derived, never hand-written: the API owns these shapes.
export type CREDENTIALS = components["schemas"]["LoginDto"];

export type REGISTRATION = components["schemas"]["RegisterDto"];
