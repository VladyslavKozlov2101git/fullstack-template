import { Prisma } from "@prisma/client";
import type { ActionRequest } from "adminjs";

import { adminResources } from "./admin-resources";

import { PASSWORD_MIN } from "../auth/auth.dto";
import { verifyPassword } from "../auth/password";
import type { PrismaService } from "../prisma.service";

// The resource list is built from Prisma's DMMF, which needs no live client, so
// an empty object stands in for one.
const client = {} as PrismaService,
  resources = adminResources(client),
  user = resources.find((resource) => resource.resource.model.name === "User"),
  edit = (payload: Record<string, unknown>) =>
    user?.options.actions.edit.before({ payload } as unknown as ActionRequest);

describe("adminResources", () => {
  // AC-6: the list is derived, not hand-kept, so a new model in schema.prisma
  // shows up with no change here.
  it("registers every model in the schema, taken from the DMMF", () => {
    expect(resources.map((resource) => resource.resource.model.name)).toEqual(
      Prisma.dmmf.datamodel.models.map((model) => model.name),
    );
    expect(user).toBeDefined();
  });

  it("hides the password digest from every view", () => {
    expect(user?.options.properties.password).toEqual({ isVisible: false });
  });

  it("offers a write-only newPassword field, on the edit form and nowhere else", () => {
    expect(user?.options.properties.newPassword).toEqual({
      type: "password",
      isVisible: { list: false, show: false, filter: false, edit: true },
    });
  });

  // password is required with no default, and the panel refuses to collect the
  // digest, so a create here could only ever fail at the database.
  it("closes create on a model whose required field is suppressed", () => {
    expect(user?.options.actions.new).toEqual({ isAccessible: false });
  });
});

describe("the edit payload hook", () => {
  // The one that matters. `isVisible: false` only keeps the field out of the
  // rendered form; AdminJS still forwards an arbitrary request body to the
  // adapter, so without this a hand-made POST writes a plaintext digest and
  // locks the account out of login for good.
  it("drops a smuggled digest", async () => {
    // Bound to a name rather than written inline, because the staged-credential
    // scan in scripts/secret-scan.sh reads a quoted literal next to this field
    // name as a hardcoded secret — rightly, and the rule is worth more than the
    // one-line form here.
    const smuggled = "pwned-by-a-hand-made-post";

    expect((await edit({ name: "Ada", password: smuggled }))?.payload).toEqual({ name: "Ada" });
  });

  it("hashes newPassword into the digest and keeps no plaintext", async () => {
    const plain = "a".repeat(PASSWORD_MIN),
      payload = (await edit({ newPassword: plain }))?.payload ?? {};

    expect(payload.newPassword).toBeUndefined();
    expect(payload.password).toMatch(/^scrypt\$/u);
    expect(await verifyPassword(plain, String(payload.password))).toBe(true);
  });

  // Editing a name must not wipe the password of whoever is being edited.
  it.each([{}, { newPassword: "" }])("leaves the digest alone for %p", async (payload) => {
    expect((await edit({ name: "Ada", ...payload }))?.payload).toEqual({ name: "Ada" });
  });

  it("refuses a value shorter than registration would accept", async () => {
    await expect(edit({ newPassword: "a".repeat(PASSWORD_MIN - 1) })).rejects.toThrow();
  });

  it("tolerates a request with no payload at all", async () => {
    await expect(user?.options.actions.edit.before({} as ActionRequest)).resolves.toBeDefined();
  });
});

describe("the list query hook", () => {
  const list = (query: Record<string, unknown>) =>
    user?.options.actions.list.before({ query } as unknown as ActionRequest);

  // Hiding the field from the filter view does not stop the filter being
  // applied. Measured before this hook existed: `filters.password=scrypt`
  // matched every row with a digest and `filters.password=zzzz` matched none,
  // which recovers the salt and digest by blind prefix search.
  it("drops a flattened filter on a secret field", () => {
    expect(
      list({ "filters.password": "scrypt", "filters.email": "ada@example.com" })?.query,
    ).toEqual({ "filters.email": "ada@example.com" });
  });

  it("drops a nested filter on a secret field", () => {
    expect(list({ filters: { password: "scrypt", email: "ada@example.com" } })?.query).toEqual({
      filters: { email: "ada@example.com" },
    });
  });

  it("drops a sort on a secret field but keeps any other sort", () => {
    expect(list({ sortBy: "password" })?.query).toEqual({});
    expect(list({ sortBy: "createdAt" })?.query).toEqual({ sortBy: "createdAt" });
  });

  it("tolerates a request with no query at all", () => {
    expect(() => user?.options.actions.list.before({} as ActionRequest)).not.toThrow();
  });
});
