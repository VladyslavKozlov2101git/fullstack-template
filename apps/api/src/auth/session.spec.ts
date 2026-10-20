import { clearedSessionCookie, sessionCookie, sessionTtlDays } from "./session";

describe("session", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("defaults to seven days", () => {
    delete process.env.JWT_TTL_DAYS;

    expect(sessionTtlDays()).toBe(7);
  });

  // Unvalidated, an empty value gives 0 — tokens that expire on issue — and a
  // non-numeric one gives NaN, which makes every sign fail with a 500.
  it.each(["", "abc", "0", "-1", "1.5"])("refuses JWT_TTL_DAYS=%p", (value) => {
    process.env.JWT_TTL_DAYS = value;

    expect(() => sessionTtlDays()).toThrow(/JWT_TTL_DAYS/);
  });

  it("drives maxAge from the same TTL as the token", () => {
    process.env.JWT_TTL_DAYS = "3";

    expect(sessionCookie().maxAge).toBe(3 * 24 * 60 * 60 * 1000);
  });

  it("sets Secure unless this is explicitly development", () => {
    process.env.NODE_ENV = "development";
    expect(sessionCookie().secure).toBe(false);

    // The point of the default: a deployment that never sets NODE_ENV still
    // gets the flag, rather than sending session cookies in the clear.
    delete process.env.NODE_ENV;
    expect(sessionCookie().secure).toBe(true);

    process.env.NODE_ENV = "production";
    expect(sessionCookie().secure).toBe(true);
  });

  it("clears with the same path and flags it set, minus the lifetime", () => {
    expect(clearedSessionCookie().path).toBe(sessionCookie().path);
    expect(clearedSessionCookie().maxAge).toBeUndefined();
  });
});
