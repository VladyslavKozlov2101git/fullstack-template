import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

import { SESSION_COOKIE } from "./session";

import { PrismaService } from "../prisma.service";
import { UserDto } from "../users/user.dto";

export interface AuthedRequest extends Request {
  user: UserDto;
}

/**
 * ponytail: one cookie read straight off the header — cookie-parser would be a
 * dependency for a two-line split. The name is matched exactly, not by prefix,
 * or `my_access_token=` would be accepted as the session.
 */
export const readCookie = (header: string | undefined, name: string): string | undefined =>
  header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>(),
      token = readCookie(request.headers.cookie, SESSION_COOKIE);

    if (!token) throw new UnauthorizedException();

    let sub: string;
    try {
      ({ sub } = await this.jwt.verifyAsync<{ sub: string }>(token));
    } catch {
      // Expired, tampered or signed with another key — all the same answer.
      throw new UnauthorizedException();
    }

    // Looked up on every request on purpose: a deleted user stops being
    // authenticated immediately instead of when the token runs out.
    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user) throw new UnauthorizedException();

    (request as AuthedRequest).user = user;

    return true;
  }
}
