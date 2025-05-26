import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { UserModule } from '../user/user.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
	imports: [UserModule, ConversationModule],
	controllers: [LikesController],
	providers: [LikesService],
	exports: [LikesService],
})
export class LikesModule {}
