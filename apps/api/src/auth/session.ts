import type { CookieOptions } from "express";

export const SESSION_COOKIE = "access_token";

/**
 * One TTL drives both the JWT's `expiresIn` and the cookie's `maxAge`, so the
 * cookie can never outlive the token it carries or the other way round.
 */
export const SESSION_TTL_DAYS = Number(process.env.JWT_TTL_DAYS ?? 7);

const base: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const sessionCookie = (): CookieOptions => ({
  ...base,
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
});

/** clearCookie only matches a cookie whose path and flags are the same. */
export const clearedSessionCookie = (): CookieOptions => base;
