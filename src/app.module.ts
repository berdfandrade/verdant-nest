import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { RATE_LIMITS, RateLimitConfig } from "./config/rate-limit.config";
import { HttpThrottlerGuard } from "./config/http-throttler.guard";
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
import { StorageModule } from "./storage/storage.module";
import { SafetyModule } from "./safety/safety.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ...RATE_LIMITS.default }],
      skipIf: () => !RateLimitConfig.enabled,
    }),
    ServeStaticModule.forRoot(StaticFilesConfig),
    StorageModule,
    forwardRef(() => ChatModule),
    UserModule,
    AuthModule,
    AdminModule,
    SafetyModule,
    ProfileModule,
    ConversationModule,
    DatabaseModule,
    LikesModule,
    RedisModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: HttpThrottlerGuard }],
})
export class AppModule {}
