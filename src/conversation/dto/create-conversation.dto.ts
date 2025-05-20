import mongoose from 'mongoose';
import { Types } from 'mongoose';
import {
	IsArray,
	IsBoolean,
	IsDate,
	IsMongoId,
	IsNotEmpty,
	IsOptional,
	ValidateNested,
	IsString
} from 'class-validator';
import { Type } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class CreateMessageDto {
  @IsMongoId()
  sender: Types.ObjectId;

  @IsString()
  content: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  sentAt?: Date;
}


export class CreateConversationDto {
	@IsArray()
	participants: Types.ObjectId[];

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
