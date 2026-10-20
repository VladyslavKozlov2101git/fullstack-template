import { Prisma } from "@prisma/client";
import type { ActionRequest } from "adminjs";

import { PASSWORD_MAX, PASSWORD_MIN } from "../auth/auth.dto";
import { hashPassword } from "../auth/password";
import type { PrismaService } from "../prisma.service";

// Never rendered in the panel and never accepted from it, on any model that has
// them. A scrypt digest is not an editable string. Adding a name here suppresses
// it everywhere at once — the loop below never needs to know which models carry
// it.
const SECRET_FIELDS = new Set(["password"]),
  // The only write path for the digest: a virtual field, shown on the edit form
  // but present in no model. A custom AdminJS action with its own input would
  // need a React component, and bundling components is precisely what cannot run
  // here — see the comment in admin.module.ts. This needs no component at all.
  NEW_PASSWORD = "newPassword",
  /**
   * Runs before every create and edit.
   *
   * `isVisible: false` keeps a field out of the list, show, edit and filter
   * views, but not out of the request: AdminJS forwards whatever the body
   * contains down to the adapter, and `@adminjs/prisma` builds its field list
   * from Prisma's DMMF rather than from the `omit` in prisma.service.ts. So the
   * flag alone is a plaintext-write hole — a hand-made POST could set the digest
   * to a literal string and the login would never match again. The digest is
   * therefore dropped unconditionally, and the only way to set one is
   * `newPassword`, hashed here.
   *
   * An absent or empty value leaves the stored digest alone, so editing a name
   * does not wipe someone's password.
   */
  sanitizePayload = async (request: ActionRequest): Promise<ActionRequest> => {
    if (!request.payload) return request;

    const plain = request.payload[NEW_PASSWORD];

    delete request.payload[NEW_PASSWORD];

    for (const field of SECRET_FIELDS) delete request.payload[field];

    if (typeof plain !== "string" || plain.length === 0) return request;

    // The same bounds as POST /api/auth/register, imported rather than restated:
    // an admin must not be able to set a password registration would refuse.
    if (plain.length < PASSWORD_MIN || plain.length > PASSWORD_MAX) {
      const { ValidationError } = await import("adminjs");

      throw new ValidationError({
        [NEW_PASSWORD]: {
          message: `Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`,
        },
      });
    }

    request.payload.password = await hashPassword(plain);

    return request;
  };

/**
 * Every model in the schema, read from Prisma's DMMF rather than a list kept by
 * hand, so a new model appears in the panel with no code change here. This is
 * the same source `@adminjs/prisma`'s own `getModelByName` reads.
 */
export const adminResources = (client: PrismaService) =>
  Prisma.dmmf.datamodel.models.map((model) => {
    const secrets = model.fields.filter((field) => SECRET_FIELDS.has(field.name)),
      // A row that cannot be created without a value the panel refuses to collect
      // would only ever fail at the database, so the action is closed instead of
      // offered. Users are created by POST /api/auth/register, which hashes.
      blocksCreate = secrets.some((field) => field.isRequired && !field.hasDefaultValue),
      properties: Record<string, unknown> = Object.fromEntries(
        secrets.map((field) => [field.name, { isVisible: false }]),
      );

    if (secrets.some((field) => field.name === "password")) {
      properties[NEW_PASSWORD] = {
        type: "password",
        isVisible: { list: false, show: false, filter: false, edit: true },
      };
    }

    return {
      resource: { model, client },
      options: {
        properties,
        actions: {
          edit: { before: sanitizePayload },
          new: blocksCreate ? { isAccessible: false } : { before: sanitizePayload },
        },
      },
    };
  });
