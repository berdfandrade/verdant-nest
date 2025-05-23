import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationService } from './conversation.service';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { ConversationController } from './conversation.controller';
import { MessagesModule } from '../messages/messages.module';

@Module({
	imports: [
		forwardRef(() => MessagesModule),
		MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }]),
	],
	controllers: [ConversationController],
	providers: [ConversationService],
	exports: [ConversationService, MongooseModule],
})
export class ConversationModule {}
