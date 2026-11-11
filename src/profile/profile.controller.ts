import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { User } from '@/auth/decorators/user.decorator';
import { UpdatePreferencesDto } from '@/user/dto/update-preferences.dto';
import { UpdateAboutDto } from '@/user/dto/update-about.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { MAX_PHOTO_SIZE_BYTES, PhotosService } from './photos.service';

@ApiTags('🙋 Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
	constructor(
		private readonly profileService: ProfileService,
		private readonly photosService: PhotosService,
	) {}

	// Perfis próximos para o usuário curtir / passar
	@Get('feed')
	async feed(@User() user: any) {
		return this.profileService.showMeProfiles(user._id);
	}

	@Get('preferences')
	async getPreferences(@User() user: any) {
		return this.profileService.showMeMyPreferences(user._id);
	}

	@Put('preferences')
	async updatePreferences(@User() user: any, @Body() dto: UpdatePreferencesDto) {
		return this.profileService.changeMyConfigs(user._id, dto);
	}

	@Get('about')
	async getAbout(@User() user: any) {
		return this.profileService.showMeAboutMe(user._id);
	}

	@Put('about')
	async updateAbout(@User() user: any, @Body() dto: UpdateAboutDto) {
		return this.profileService.changeAboutMe(user._id, dto);
	}

	@Put('location')
	async updateLocation(@User() user: any, @Body() dto: UpdateLocationDto) {
		return this.profileService.updateLocation(user._id, dto);
	}

	// ---- Fotos ----

	@Post('photos')
	@ApiConsumes('multipart/form-data')
	@ApiBody({ schema: { type: 'object', properties: { photo: { type: 'string', format: 'binary' } } } })
	@UseInterceptors(
		FileInterceptor('photo', {
			storage: memoryStorage(),
			// Acima do limite o multer responde 413 (Payload Too Large)
			limits: { fileSize: MAX_PHOTO_SIZE_BYTES, files: 1 },
		}),
	)
	async uploadPhoto(@User() user: any, @UploadedFile() file: Express.Multer.File) {
		return this.photosService.upload(user._id, file);
	}

	@Delete('photos/:photoId')
	async removePhoto(@User() user: any, @Param('photoId') photoId: string) {
		return this.photosService.remove(user._id, photoId);
	}

	@Patch('photos/:photoId/main')
	async setMainPhoto(@User() user: any, @Param('photoId') photoId: string) {
		return this.photosService.setMain(user._id, photoId);
	}
}
