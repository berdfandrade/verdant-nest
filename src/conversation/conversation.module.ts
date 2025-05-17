import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { MessageSchema, Message } from './schemas/message.schema';
import { ConversationController } from './conversation.controller';

@Module({
	imports: [
		MongooseModule.forFeature
        ([{ name: Conversation.name, schema: ConversationSchema }]),
	],
	controllers: [ConversationController],
	providers: [ConversationService],
	exports: [ConversationService],
})
export class ConversationModule {}
