import { Types } from 'mongoose';

// TODO : Completar depois o DTO
export class SendMessageDto {
	sender: Types.ObjectId;
	conversationId: Types.ObjectId;
	content: string;
	sentAt: Date;
}
