import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { ChatGateway } from './chat/chat.gateway';
import { ConversationModule } from './conversation/conversation.module';
import { LikesModule } from './likes/likes.module';
import { RedisModule } from './redis/redis.module';
import { ChatModule } from './chat/chat.module';
import { StaticFilesConfig } from './config/staticfiles.config';
import { MessagesModule } from './messages/messages.module';
import { forwardRef } from '@nestjs/common';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		ServeStaticModule.forRoot(StaticFilesConfig),
		forwardRef(() => ChatModule),
		UserModule,
		ConversationModule,
		DatabaseModule,
		ChatGateway,
		LikesModule,

		RedisModule,
		MessagesModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
