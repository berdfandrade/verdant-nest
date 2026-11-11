import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/decorators/user.decorator';
import { UpdatePreferencesDto } from '../user/dto/update-preferences.dto';
import { UpdateAboutDto } from '../user/dto/update-about.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('🙋 Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

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
}
