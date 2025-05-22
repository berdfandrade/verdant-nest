import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { RedisProvider } from '../redis/redis.provider';
import { ChatController } from './chat.controller';

@Module({
	imports: [ConversationModule],
	controllers: [ChatController],
	providers: [ChatGateway, ChatService, RedisProvider],
})
export class ChatModule {}
