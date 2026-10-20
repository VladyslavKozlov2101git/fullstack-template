import { ExecutionContext, createParamDecorator } from "@nestjs/common";

import { AuthedRequest } from "./jwt-auth.guard";

import { UserDto } from "../users/user.dto";

/** Only meaningful behind `JwtAuthGuard`, which is what puts `user` on the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserDto =>
    context.switchToHttp().getRequest<AuthedRequest>().user,
);
