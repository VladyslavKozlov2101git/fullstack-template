import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";

import { LoginDto, RegisterDto } from "./auth.dto";
import { decoyDigest, hashPassword, verifyPassword } from "./password";

import { PrismaService } from "../prisma.service";
import { UserDto } from "../users/user.dto";

export interface Session {
  user: UserDto;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<Session> {
    try {
      // The unique index decides, not a read-then-write: two simultaneous
      // registrations of one email cannot both pass a pre-flight check.
      const user = await this.prisma.user.create({
        data: { email: dto.email, password: await hashPassword(dto.password) },
      });

      return this.session(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("That email is already registered.");
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<Session> {
    const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        omit: { password: false },
      }),
      // Verify against a decoy when the email is unknown, so the response time
      // does not say whether the account exists.
      matches = await verifyPassword(dto.password, user?.password ?? (await decoyDigest()));

    if (!user || !matches) {
      // One message and one status for an unknown email and a wrong password:
      // the response must not be usable to enumerate accounts.
      throw new UnauthorizedException("Email or password is incorrect.");
    }

    const { password: _password, ...rest } = user;

    return this.session(rest);
  }

  private async session(user: UserDto): Promise<Session> {
    return { user, token: await this.jwt.signAsync({ sub: user.id }) };
  }
}
