import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
import { Message, MessageSchema } from './message.schema';
import { User } from 'src/user/user.schema';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema()
export class Conversation {
  @Prop()
  id : string
  
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  participants: Types.ObjectId[];

  @Prop({ type: [MessageSchema], default: [] })
  messages: Message[];

  @Prop({ type: Date, default: Date.now })
  startedAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  archivedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
