import { Types } from 'mongoose';

export class ModifyMessage {
	conversationId: Types.ObjectId;
	messageId: Types.ObjectId;
	sender: Types.ObjectId;
	content: string;
}
