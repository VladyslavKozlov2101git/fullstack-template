import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";

import { UserDto } from "./user.dto";
import { UsersService } from "./users.service";

import { ApiErrorDto } from "../auth/auth.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

// Guarded: the list is every registered email, which was public until auth
// existed.
@Controller("users")
@UseGuards(JwtAuthGuard)
@ApiCookieAuth()
@ApiUnauthorizedResponse({ type: ApiErrorDto })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserDto, isArray: true })
  findAll(): Promise<UserDto[]> {
    return this.users.findAll();
  }
}
