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
