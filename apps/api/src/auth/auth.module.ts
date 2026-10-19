import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SESSION_TTL_DAYS } from "./session";

import { PrismaService } from "../prisma.service";

// Read at module scope so a missing secret fails during NestFactory.create
// rather than on the first login. Never a literal fallback: a default secret is
// a signing key every copy of this template would share.
const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not set. Copy apps/api/.env.example to .env and set it.");
}

@Module({
  imports: [
    JwtModule.register({
      // `global` because JwtAuthGuard is also used from UsersModule, and a
      // guard resolves its dependencies from the injector of the module that
      // declares the controller — without this the app does not boot.
      global: true,
      secret,
      signOptions: { expiresIn: `${SESSION_TTL_DAYS}d` },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AuthModule {}
