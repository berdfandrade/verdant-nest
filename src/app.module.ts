import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UserModule } from "./user/user.module";
import { DatabaseModule } from "./database/database.module";
import { ConversationModule } from "./conversation/conversation.module";
import { LikesModule } from "./likes/likes.module";
import { RedisModule } from "./redis/redis.module";
import { ChatModule } from "./chat/chat.module";
import { StaticFilesConfig } from "./config/staticfiles.config";
import { MessagesModule } from "./messages/messages.module";
import { forwardRef } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { AdminModule } from "./admin/admin.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot(StaticFilesConfig),
    forwardRef(() => ChatModule),
    UserModule,
    AuthModule,
    AdminModule,
    ProfileModule,
    ConversationModule,
    DatabaseModule,
    LikesModule,
    RedisModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
