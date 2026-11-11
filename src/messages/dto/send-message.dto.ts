import { Types } from 'mongoose';
import { IsDate, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export const MAX_MESSAGE_LENGTH = 2000;

export class SendMessageDto {
	// Na rota HTTP o sender é sempre o usuário autenticado (sobrescrito no controller)
	@IsOptional()
	@IsMongoId()
	sender: Types.ObjectId;

	@IsMongoId()
	conversationId: Types.ObjectId;

	@IsString()
	@IsNotEmpty()
	@MaxLength(MAX_MESSAGE_LENGTH)
	content: string;

	@IsOptional()
	@IsDate()
	@Type(() => Date)
	sentAt?: Date;
}
