import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CryptService } from '../security/crypt.service';
import { UserService } from '../user/user.service';
import { AuthDto } from './dto/auth.dto';
import { LogExecutionTime } from '../utils/LogExectionTime';

@Injectable()
export class AuthService {
	constructor(
		private userService: UserService,
		private jwtService: JwtService,
		private cryptService: CryptService,
	) {}

	private REFRESH_TOKEN_SECRET = process.env.REFRESH_JWT_SECRET || 'DefaultHashingSecret';

	@LogExecutionTime()
	async validateAndLogin(authDto: AuthDto) {
		
		try {
			const user = await this.userService.findByEmail(authDto.email);
			const isPasswordValid = await this.cryptService.comparePasswords(
				authDto.password,
				user.password,
			);
			if (!isPasswordValid) throw new UnauthorizedException('Wrong email or password');

			const payload = { sub: user.id.toString(), email: user.email };
	
			const access_token = this.jwtService.sign(payload, {expiresIn : '1h'})

			return {
				access_token: access_token,
				user: {
					id: user.id.toString(),
					email: user.email,
				},
			};

			
		} catch (err) {
			throw new UnauthorizedException('Wrong email or password');
		}
		
	}
	async verifyToken(token: string) {
		try {
			return this.jwtService.verify(token);
		} catch (error) {
			throw new UnauthorizedException('Invalid token');
		}
	}

	async createRefreshToken(user: any) {
		const refreshToken = this.jwtService.sign(
			{ sub: user.id.toString(), email: user.email },
			{ expiresIn: '10d', secret: this.REFRESH_TOKEN_SECRET },
		);

		const hashedToken = await this.cryptService.hash(refreshToken);
		await this.userService.updateUser(user.id, { refreshToken: hashedToken });

		return refreshToken;
	}

	async pingAuth(user: any) {
		return {
			Message: {
				id: user._id,
				name: user.fullName,
				email: user.email,
			},
		};
	}
}
