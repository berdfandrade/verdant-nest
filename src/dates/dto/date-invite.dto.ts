import { Type } from "class-transformer";
import {
  IsDefined,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class DatePlaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}

export class CreateDateInviteDto {
  // Quem eu estou convidando (precisa ser um match)
  @IsMongoId()
  inviteeId: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => DatePlaceDto)
  place: DatePlaceDto;

  // Data e hora do encontro, ISO 8601 (ex.: 2026-11-21T19:00:00-03:00)
  @IsISO8601({ strict: true })
  scheduledAt: string;
}

// Intervalo do calendário. Sem `from`, lista só os dates a partir de agora.
export class ListDatesQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;
}
