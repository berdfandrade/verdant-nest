import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { ChatController } from './chat.controller';
import { RedisModule } from '../redis/redis.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
	imports: [ConversationModule, RedisModule, MessagesModule],
	controllers: [ChatController],
	providers: [ChatGateway, ChatService],
})
export class ChatModule {}
