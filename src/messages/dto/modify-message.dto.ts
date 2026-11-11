import { Types } from 'mongoose';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MAX_MESSAGE_LENGTH } from './send-message.dto';

export class ModifyMessage {
	conversationId?: Types.ObjectId;
	messageId: Types.ObjectId;
	sender: Types.ObjectId;
	content: string;
}

// Body da rota PATCH /messages/:id
export class EditMessageDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(MAX_MESSAGE_LENGTH)
	content: string;
}
