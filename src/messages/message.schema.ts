import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema()
export class Message extends Document {
	@Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
	sender: Types.ObjectId;

	@Prop({ required: true })
	content: string;

	@Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Conversation', required: true })
	conversationId: Types.ObjectId;

	@Prop({ type: Date, default: Date.now })
	sentAt: Date;

	@Prop({ type: Date })
	editedAt?: Date;

	// Quando o outro participante leu (conversas são 1:1)
	@Prop({ type: Date, default: null })
	readAt?: Date | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, sentAt: -1 });
// Contagem de não lidas por conversa
MessageSchema.index({ conversationId: 1, readAt: 1, sender: 1 });
