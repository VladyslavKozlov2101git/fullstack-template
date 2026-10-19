import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export const PASSWORD_MIN = 8,
  // scrypt hashes whatever it is given, so an unbounded password is free work
  // for an attacker. A bound, not a bcrypt-style limit — scrypt has none, and
  // this is high enough that no real passphrase meets it.
  PASSWORD_MAX = 128;

/**
 * Lower-cased at the boundary, so `A@x.com` and `a@x.com` cannot become two
 * accounts. Doing it here rather than in the service means no query can forget.
 */
const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export class LoginDto {
  @ApiProperty({ example: "ada@example.com" })
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  email: string;

  // Shape only, no length rule: a short wrong password must answer 401 like any
  // other wrong password, not 400 with the registration rule.
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: "ada@example.com" })
  @Transform(({ value }) => normalizeEmail(value))
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsString()
  @MinLength(PASSWORD_MIN, { message: `Password must be at least ${PASSWORD_MIN} characters.` })
  @MaxLength(PASSWORD_MAX, { message: `Password must be at most ${PASSWORD_MAX} characters.` })
  password: string;
}

/**
 * Nest's error body, declared so the generated client types it. The frontend
 * renders `message` verbatim on the form, which makes it part of the contract —
 * an `@ApiResponse` without a `type` emits no schema and leaves `error` as
 * `never`. ValidationPipe returns an array, everything else a string.
 */
export class ApiErrorDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty({ oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] })
  message: string | string[];

  @ApiPropertyOptional()
  error?: string;
}
