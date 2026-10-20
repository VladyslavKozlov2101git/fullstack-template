import { Prisma } from "@prisma/client";
import type { ActionRequest } from "adminjs";

import type { PrismaService } from "../prisma.service";

// Never rendered in the panel and never accepted from it, on any model that has
// them. A scrypt digest is not an editable string: it is written only by the
// set-password action, which hashes first. Adding a name here suppresses it
// everywhere at once — the loop below never needs to know which models carry it.
const SECRET_FIELDS = new Set(["password"]),
  /**
   * `isVisible: false` keeps a field out of the list, show, edit and filter views,
   * but AdminJS still forwards whatever the request body contains down to the
   * adapter. So the flag alone is a plaintext-write hole: a hand-made POST could
   * set `password` to a literal string and the login would never match again.
   * Dropping the keys from the payload is the part that actually protects it.
   *
   * `@adminjs/prisma` builds its field list from Prisma's DMMF, not from the
   * `omit` in prisma.service.ts, which is why the field is here at all.
   */
  stripSecrets = (request: ActionRequest): ActionRequest => {
    if (!request.payload) return request;

    for (const field of SECRET_FIELDS) delete request.payload[field];

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
      blocksCreate = secrets.some((field) => field.isRequired && !field.hasDefaultValue);

    return {
      resource: { model, client },
      options: {
        properties: Object.fromEntries(secrets.map((field) => [field.name, { isVisible: false }])),
        actions: {
          edit: { before: stripSecrets },
          new: blocksCreate ? { isAccessible: false } : { before: stripSecrets },
        },
      },
    };
  });
