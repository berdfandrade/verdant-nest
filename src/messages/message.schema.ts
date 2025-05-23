import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document, HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema()
export class Message extends Document {
	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	sender: Types.ObjectId;

	@Prop({ required: true })
	content: string;

	@Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
	conversationId: Types.ObjectId;

	@Prop({ type: Date, default: Date.now })
	sentAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
