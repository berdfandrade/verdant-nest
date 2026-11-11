import { Controller, Body, Post, HttpCode, Get, UseGuards } from '@nestjs/common';
import { User } from './decorators/user.decorator';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from './decorators/admin-only-decorator';

import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('🔒 Auth')
@ApiBearerAuth()
@Controller('login')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post()
	@HttpCode(200)
	async login(@Body() authDto: AuthDto) {
		return this.authService.validateAndLogin(authDto);
	}

	@Post('refresh')
	@HttpCode(200)
	async refresh(@Body() dto: RefreshTokenDto) {
		return this.authService.refreshTokens(dto.refresh_token);
	}

	@UseGuards(JwtAuthGuard)
	@Post('logout')
	@HttpCode(200)
	async logout(@User() user: any) {
		return this.authService.logout(user.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('auth_ping')
	async pingAuth(@User() user: any) {
		return this.authService.pingAuth(user);
	}

	@Post('admin')
	@HttpCode(200)
	async adminLogin(@Body() authDto: AuthDto) {
		return this.authService.adminLogin(authDto);
	}

	@AdminOnly()
	@Get('hello')
	async getHello() {
		return 'Hello from Guard';
	}
}
