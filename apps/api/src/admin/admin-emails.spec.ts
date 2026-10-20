import { isAdminEmail } from "./admin-emails";

describe("isAdminEmail", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("admits nobody when ADMIN_EMAILS is unset", () => {
    delete process.env.ADMIN_EMAILS;

    expect(isAdminEmail("ada@example.com")).toBe(false);
  });

  // Fail closed. A blank or punctuation-only list is the state a fresh deploy
  // is in, and it must not be the state that lets everyone in.
  it.each(["", "   ", ",", " , ,"])("admits nobody when ADMIN_EMAILS is %p", (value) => {
    process.env.ADMIN_EMAILS = value;

    expect(isAdminEmail("ada@example.com")).toBe(false);
  });

  it("ignores surrounding whitespace and case on both sides", () => {
    process.env.ADMIN_EMAILS = " Ada@Example.COM , bob@example.com ";

    expect(isAdminEmail("ada@example.com")).toBe(true);
    expect(isAdminEmail(" ADA@example.com ")).toBe(true);
    expect(isAdminEmail("bob@example.com")).toBe(true);
  });

  it("refuses an address that is not listed", () => {
    process.env.ADMIN_EMAILS = "ada@example.com";

    expect(isAdminEmail("eve@example.com")).toBe(false);
  });

  // Whole-entry match, not a substring one: a prefix or a suffix of a listed
  // address is a different person.
  it("does not match a prefix or an extension of a listed address", () => {
    process.env.ADMIN_EMAILS = "ada@example.com";

    expect(isAdminEmail("ada@example.co")).toBe(false);
    expect(isAdminEmail("bada@example.com")).toBe(false);
  });
});
