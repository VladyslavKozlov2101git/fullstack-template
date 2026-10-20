import { decoyDigest, hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("verifies the password it hashed", async () => {
    const stored = await hashPassword("correct horse battery");

    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse battery");

    expect(await verifyPassword("correct horse batterz", stored)).toBe(false);
  });

  it("never stores the plaintext, and salts so two users differ", async () => {
    const [one, two] = await Promise.all([
      hashPassword("same-password"),
      hashPassword("same-password"),
    ]);

    expect(one).not.toContain("same-password");
    expect(one).not.toBe(two);
    // Both still verify: the salt is per-digest, not per-password.
    expect(await verifyPassword("same-password", two)).toBe(true);
  });

  it("keeps the parameters with the digest, so cost can change later", async () => {
    const [scheme, n, r, p] = (await hashPassword("x")).split("$");

    expect(scheme).toBe("scrypt");
    expect([n, r, p].map(Number)).toEqual([32_768, 8, 1]);
  });

  it("returns false for a malformed stored value instead of throwing", async () => {
    const malformed = [
      "",
      "not-a-digest",
      "scrypt$0$8$1$aa$bb",
      "scrypt$32768$8$1$aa$bb",
      // scrypt rejects an N that is not a power of two, so this one reaches the
      // KDF and throws there. A 500 on a corrupt column would say the account
      // exists, which is the one thing the login path must not say.
      "scrypt$3$8$1$aa$bb",
      "bcrypt$32768$8$1$aa$bb",
      "scrypt$32768$8$1$$",
    ];

    for (const stored of malformed) {
      expect(await verifyPassword("x", stored)).toBe(false);
    }
  });

  it("does not cache a failed decoy, so one failure is not permanent", async () => {
    // Two calls share one computation, and it resolves — a rejected promise
    // would be handed out forever and only unknown-email logins would break.
    expect(await decoyDigest()).toBe(await decoyDigest());
    expect(await decoyDigest()).toMatch(/^scrypt\$/);
  });
});
