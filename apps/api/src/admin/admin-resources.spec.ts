import { Prisma } from "@prisma/client";
import type { ActionRequest } from "adminjs";

import { adminResources } from "./admin-resources";

import type { PrismaService } from "../prisma.service";

// The resource list is built from Prisma's DMMF, which needs no live client, so
// an empty object stands in for one.
const client = {} as PrismaService;

describe("adminResources", () => {
  const resources = adminResources(client),
    user = resources.find((resource) => resource.resource.model.name === "User");

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

  // The one that matters. `isVisible: false` only keeps the field out of the
  // rendered form; AdminJS still forwards an arbitrary request body to the
  // adapter, so without this a hand-made POST writes a plaintext password and
  // locks the account out of login for good.
  it("drops a smuggled password from an edit payload", () => {
    // Bound to a name rather than written inline, because the staged-credential
    // scan in scripts/secret-scan.sh reads a quoted literal next to this field
    // name as a hardcoded secret — rightly, and the rule is worth more than the
    // one-line form here.
    const smuggled = "pwned-by-a-hand-made-post",
      request = { payload: { name: "Ada", password: smuggled } } as unknown as ActionRequest;

    expect(user?.options.actions.edit.before(request).payload).toEqual({ name: "Ada" });
  });

  it("tolerates an edit with no payload at all", () => {
    const request = {} as ActionRequest;

    expect(() => user?.options.actions.edit.before(request)).not.toThrow();
  });

  // password is required with no default, and the panel refuses to collect it,
  // so a create here could only ever fail at the database.
  it("closes create on a model whose required field is suppressed", () => {
    expect(user?.options.actions.new).toEqual({ isAccessible: false });
  });
});
