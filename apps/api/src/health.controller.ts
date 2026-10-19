import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiProperty } from "@nestjs/swagger";

class HealthDto {
  @ApiProperty()
  status: string;
}

@Controller("health")
export class HealthController {
  @Get()
  @ApiOkResponse({ type: HealthDto })
  check(): HealthDto {
    return { status: "ok" };
  }
}
