import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PhotosService } from './photos.service';
import { ProfileController } from './profile.controller';
import { UserModule } from '@/user/user.module';

@Module({
	imports: [UserModule],
	providers: [ProfileService, PhotosService],
	controllers: [ProfileController],
	exports: [ProfileService],
})
export class ProfileModule {}
