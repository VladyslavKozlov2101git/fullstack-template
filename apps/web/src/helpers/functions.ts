import { SerializedError } from "@reduxjs/toolkit";

import { QUERY_ERROR } from "@models/Auth.model";

/**
 * Nest sends a string for most errors and an array of strings from the
 * validation pipe. The array is kept rather than joined: the forms pick which
 * field each message belongs on, and that granularity is the only way the
 * password-length message lands under the password input.
 */
export const asMessages = (message: string | string[] | undefined): string[] => {
  if (message === undefined) return [];

  return Array.isArray(message) ? message : [message];
};

/**
 * Flattens an RTK Query error into what a form needs. The union is the
 * `fakeBaseQuery` payload or a `SerializedError` from a thrown exception; both
 * carry `message`, only the first carries `status`.
 */
export const apiError = (error: QUERY_ERROR | SerializedError | undefined) => ({
  status: error && "status" in error ? error.status : undefined,
  messages: error && "message" in error ? asMessages(error.message) : [],
});
