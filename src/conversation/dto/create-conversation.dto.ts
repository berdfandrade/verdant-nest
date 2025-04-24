import {
  IsArray,
  IsBoolean,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateMessageDto {
  @IsMongoId()
  sender: string;

  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsDate()
  sentAt?: Date;
}

export class CreateConversationDto {
  @IsArray()
  @IsMongoId({ each: true })
  participants: string[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateMessageDto)
  messages?: CreateMessageDto[];

  @IsOptional()
  @IsDate()
  startedAt?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDate()
  archivedAt?: Date;
}
