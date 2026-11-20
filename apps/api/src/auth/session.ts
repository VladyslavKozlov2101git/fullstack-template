import type { CookieOptions } from "express";

export const SESSION_COOKIE = "access_token";

/**
 * One TTL drives both the JWT's `expiresIn` and the cookie's `maxAge`, so the
 * cookie can never outlive the token it carries or the other way round.
 *
 * Read when called, not at import time: module-scope env reads happen before
 * anything has loaded `.env`, and they only appeared to work because
 * `@prisma/client` loads it as a side effect of being imported first.
 */
export const sessionTtlDays = (): number => {
  const raw = process.env.JWT_TTL_DAYS ?? "7",
    days = Number(raw);

  // Validated like the secret is. Unchecked, `JWT_TTL_DAYS=` gives 0 — tokens
  // that expire on issue — and a non-numeric value gives NaN, which makes every
  // sign fail with a 500.
  if (!Number.isInteger(days) || days < 1) {
    throw new Error(`JWT_TTL_DAYS must be a whole number of days above zero, got "${raw}".`);
  }

  return days;
};

// Secure unless this is explicitly development: a deployment that forgets to set
// NODE_ENV then still gets the flag. The other default sends session cookies in
// the clear and says nothing about it.
const base = (): CookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV !== "development",
  path: "/",
});

export const sessionCookie = (): CookieOptions => ({
  ...base(),
  maxAge: sessionTtlDays() * 24 * 60 * 60 * 1000,
});

/** clearCookie only matches a cookie whose path and flags are the same. */
export const clearedSessionCookie = (): CookieOptions => base();
