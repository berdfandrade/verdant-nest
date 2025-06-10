import { Controller, Post, Body, HttpCode, Get, UseGuards, Req} from '@nestjs/common';
import { Request } from 'express';
import { User } from './decorators/user.decorator';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('login')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post()
	@HttpCode(200)
	async login(@Body() authDto: AuthDto) {
		const user = await this.authService.validateUser(authDto.email, authDto.password);
		return this.authService.login(user);
	}

	@Get('auth_ping')
	@UseGuards(JwtAuthGuard)
	async pingAuth(@User() user : any) {
		return this.authService.pingAuth(user)
	}

}
