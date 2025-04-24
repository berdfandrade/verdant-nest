import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document, HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>

@Schema({ _id: false }) 
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Date, default: Date.now })
  sentAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);