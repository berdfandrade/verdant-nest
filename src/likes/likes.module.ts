import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { UserModule } from '../user/user.module';

@Module({
	imports: [UserModule],
	controllers: [LikesController],
	providers: [LikesService],
	exports: [LikesService],
})
export class LikesModule {}
