import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { UserModule } from '../user/user.module';

@Module({
	imports: [UserModule],
	providers: [ProfileService],
	controllers: [ProfileController],
	exports: [ProfileService],
})
export class ProfileModule {}
