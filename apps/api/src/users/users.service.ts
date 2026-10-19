import { Injectable } from "@nestjs/common";

import { UserDto } from "./user.dto";

import { PrismaService } from "../prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<UserDto[]> {
    return this.prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  }
}
