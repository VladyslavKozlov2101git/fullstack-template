import { Module } from "@nestjs/common";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [AdminModule, AuthModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule {}
