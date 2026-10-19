import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Prisma connects lazily on first query — no onModuleInit needed.
@Injectable()
export class PrismaService extends PrismaClient {}
