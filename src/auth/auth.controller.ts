import { Controller, Body, Post, HttpCode, Get, UseGuards, Req } from '@nestjs/common';
import { User } from './decorators/user.decorator';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('🔒 Auth')
@Controller('login')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post()
	@HttpCode(200)
	async login(@Body() authDto: AuthDto) {
		return this.authService.validateAndLogin(authDto)
	}

	@Get('auth_ping')
	@UseGuards(JwtAuthGuard)
	async pingAuth(@User() user: any) {
		return this.authService.pingAuth(user);
	}

	// @Post('refresh')
	// async refreshToken(@Body() body : {refresh_token : string}) {
	// 	return this.authService.refreshToken(body.refresh_token)
	// }
}
