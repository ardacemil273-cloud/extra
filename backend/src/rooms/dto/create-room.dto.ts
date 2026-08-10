import {
  IsString,
  MinLength,
  MaxLength,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
  Max,
} from "class-validator";

export class CreateRoomDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  name: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsString()
  @MinLength(4)
  @MaxLength(32)
  @IsOptional()
  password?: string;

  @IsInt()
  @Min(2)
  @Max(16)
  @IsOptional()
  maxPlayers?: number;

  @IsString()
  @IsOptional()
  gameType?: string;
}
