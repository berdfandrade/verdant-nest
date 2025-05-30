import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post('login')
	async login(@Body() authDto: AuthDto) {
		const user = await this.authService.validateUser(authDto.email, authDto.password);
		return this.authService.login(user);
	}
}
