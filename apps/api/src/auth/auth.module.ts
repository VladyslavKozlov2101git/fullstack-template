import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { sessionTtlDays } from "./session";

import { PrismaService } from "../prisma.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      // `global` because JwtAuthGuard is also used from UsersModule, and a
      // guard resolves its dependencies from the injector of the module that
      // declares the controller — without this the app does not boot.
      global: true,
      // A factory, not `register`, so the environment is read during module
      // initialisation instead of at import time. At import time `.env` has not
      // been loaded yet and the values depend on which module happens to be
      // evaluated first.
      useFactory: () => {
        const secret = process.env.JWT_SECRET;

        // Never a literal fallback: a default signing key would be shared by
        // every copy of this template, which is the same as no signature.
        if (!secret) {
          throw new Error("JWT_SECRET is not set. Copy apps/api/.env.example to .env and set it.");
        }

        return { secret, signOptions: { expiresIn: `${sessionTtlDays()}d` } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AuthModule {}
