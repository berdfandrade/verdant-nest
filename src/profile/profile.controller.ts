import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}
}
