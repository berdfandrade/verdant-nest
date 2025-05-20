import { ConfigModule } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UserModule } from "./user/user.module";
import { DatabaseModule } from "./database/database.module";
import { ChatGateway } from "./chat/chat.gateway";
import { ConversationModule } from "./conversation/conversation.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    ConversationModule,
    DatabaseModule,
    ChatGateway
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
