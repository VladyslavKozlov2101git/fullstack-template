import { ApiProperty } from "@nestjs/swagger";

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty()
  createdAt: Date;
}
