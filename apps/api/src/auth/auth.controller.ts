import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";

import { ApiErrorDto, LoginDto, RegisterDto } from "./auth.dto";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { SESSION_COOKIE, clearedSessionCookie, sessionCookie } from "./session";

import { UserDto } from "../users/user.dto";

// `@Res({ passthrough: true })` on every route that touches the cookie: without
// `passthrough` Nest hands the response over and ignores the returned value, so
// the request never finishes.
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiCreatedResponse({ type: UserDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    const { user, token } = await this.auth.register(dto);

    // Registration signs the user in; no second step.
    res.cookie(SESSION_COOKIE, token, sessionCookie());

    return user;
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserDto })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<UserDto> {
    const { user, token } = await this.auth.login(dto);

    res.cookie(SESSION_COOKIE, token, sessionCookie());

    return user;
  }

  // Unguarded on purpose: clearing a cookie needs no session, it is idempotent,
  // and a 401 here would only be noise.
  @Post("sign-out")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  signOut(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, clearedSessionCookie());
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  me(@CurrentUser() user: UserDto): UserDto {
    return user;
  }
}
