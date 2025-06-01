import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { ChatController } from './chat.controller';
import { RedisModule } from '../redis/redis.module';
import { MessagesModule } from '../messages/messages.module';
import { forwardRef } from '@nestjs/common';
import { MessagesService } from 'src/messages/messages.service';
import { ChatGateway } from './chat.gateway';

@Module({
	imports: [ConversationModule, RedisModule, MessagesModule],
	controllers: [ChatController],
	providers: [ChatService],
})
export class ChatModule {}
