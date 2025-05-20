import mongoose from 'mongoose';
import { Types } from 'mongoose';
import { IsArray, IsBoolean, IsDate, IsMongoId, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ObjectId } from 'mongoose';

class CreateMessageDto {
	@IsNotEmpty()
	sender: mongoose.Types.ObjectId;

	@IsNotEmpty()
	content: string;

	@IsOptional()
	@IsDate()
	sentAt?: Date;
}

export class CreateConversationDto {
	
	@IsArray()
	participants: Types.ObjectId[]

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
