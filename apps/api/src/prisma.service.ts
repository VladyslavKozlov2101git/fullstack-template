import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

// Prisma connects lazily on first query — no onModuleInit needed.
//
// `omit` drops the password digest from every query in the app. Without it
// `user.findMany()` returns it, `User` is structurally assignable to `UserDto`,
// and `GET /users` serves every hash while typecheck stays green. Opting back in
// is explicit and local: `omit: { password: false }` in the auth service.
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({ omit: { user: { password: true } } });
  }
}
