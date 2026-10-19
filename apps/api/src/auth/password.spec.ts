import { hashPassword, verifyPassword } from "./password";

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
    for (const stored of ["", "not-a-digest", "scrypt$0$8$1$aa$bb", "scrypt$32768$8$1$aa$bb"]) {
      expect(await verifyPassword("x", stored)).toBe(false);
    }
  });
});
