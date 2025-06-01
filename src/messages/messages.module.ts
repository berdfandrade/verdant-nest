import { Module, forwardRef } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ConversationModule } from '../conversation/conversation.module';
import { Message, MessageSchema } from './message.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesController } from './messages.controller';

@Module({
	imports: [
		forwardRef(() => ConversationModule),
		MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
	],
	controllers: [MessagesController],
	providers: [MessagesService],
	exports: [MessagesService, MongooseModule],
})
export class MessagesModule {}
