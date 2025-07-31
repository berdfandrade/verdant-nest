import { Controller, Body, Post, HttpCode, Get, UseGuards, Req } from '@nestjs/common';
import { User } from './decorators/user.decorator';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';

import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from './decorators/admin-only-decorator';

import { SelfOnly } from './decorators/self-only.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';


@ApiTags('🔒 Auth')
@Controller('login')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post()
	@HttpCode(200)
	async login(@Body() authDto: AuthDto) {
		return this.authService.validateAndLogin(authDto)
	}

	@UseGuards(JwtAuthGuard)
	@Get('auth_ping')
	async pingAuth(@User() user: any) {
		return this.authService.pingAuth(user);
	}

	@Post('admin')
	async adminLogin(@Body() authDto : AuthDto) {
		return this.authService.adminLogin(authDto)
	}

	@AdminOnly()
	@Get('hello')
	async getHello() {
		return 'Hello from Guard'
	}
}
