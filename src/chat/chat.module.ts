import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { RedisProvider } from '../redis/redis.provider';
import { ChatController } from './chat.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
	imports: [ConversationModule, RedisModule],
	controllers: [ChatController],
	providers: [ChatGateway, ChatService],
})
export class ChatModule {}
