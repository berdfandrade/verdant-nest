import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { Message } from 'src/messages/message.schema';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema()
export class Conversation extends Document {

	@Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
	participants: Types.ObjectId[];

	@Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }], default: [] })
	messages: Message[];

	@Prop({ type: Date, default: Date.now })
	startedAt: Date;

	@Prop({ default: true })
	isActive: boolean;

	@Prop()
	archivedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
