import { components } from "@repo/api-client";

// Derived, never hand-written: the API owns these shapes.
export type CREDENTIALS = components["schemas"]["LoginDto"];

export type REGISTRATION = components["schemas"]["RegisterDto"];

/**
 * What a failed `queryFn` hands to `fakeBaseQuery`. `message` keeps the array
 * the validation pipe sends, so a form can tell which field each one belongs
 * on instead of showing one joined blob.
 */
export interface QUERY_ERROR {
  status: number;
  message: string | string[];
}
