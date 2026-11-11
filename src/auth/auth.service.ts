import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { CryptService } from '../security/crypt.service';
import { UserService } from '../user/user.service';
import { AuthDto } from './dto/auth.dto';
import { AdminService } from '../admin/admin.service';
import { RefreshJwtConfig } from '../config/jwt.config';

export interface TokenPayload {
	sub: string;
	email: string;
}

@Injectable()
export class AuthService {
	constructor(
		@Inject('JWT_ADMIN_SERVICE') private readonly adminJwt: JwtService,
		private userService: UserService,
		private jwtService: JwtService,
		private cryptService: CryptService,
		private adminService: AdminService,
	) {}

	async validateAndLogin(authDto: AuthDto) {
		let user;

		try {
			user = await this.userService.findByEmail(authDto.email);
		} catch {
			throw new UnauthorizedException('Wrong email or password');
		}

		const isPasswordValid = await this.cryptService.comparePasswords(
			authDto.password,
			user.password,
		);
		if (!isPasswordValid) throw new UnauthorizedException('Wrong email or password');
		if (!user.active) throw new UnauthorizedException('User is disabled');

		const payload: TokenPayload = { sub: user.id.toString(), email: user.email };

		const access_token = this.jwtService.sign(payload, { expiresIn: '1h' });
		const refresh_token = await this.createRefreshToken(user);

		return {
			access_token: access_token,
			refresh_token: refresh_token,
			user: {
				id: user.id.toString(),
				email: user.email,
			},
		};
	}

	async adminLogin(authDto: AuthDto) {
		try {
			const admin = await this.adminService.findByEmail(authDto.email);
			const isPasswordValid = await this.cryptService.comparePasswords(
				authDto.password,
				admin.password,
			);
			if (!isPasswordValid) throw new UnauthorizedException('Wrong email or password');

			const payload: TokenPayload = { sub: admin.id.toString(), email: admin.email };

			const access_token = this.adminJwt.sign(payload, { expiresIn: '1h' });

			return {
				access_token: access_token,
				admin: {
					id: admin.id.toString(),
					email: admin.email,
				},
			};
		} catch (error) {
			throw new UnauthorizedException('Wrong email or password');
		}
	}

	async verifyToken(token: string): Promise<TokenPayload> {
		try {
			return this.jwtService.verify<TokenPayload>(token);
		} catch (error) {
			throw new UnauthorizedException('Invalid token');
		}
	}

	async createRefreshToken(user: any) {
		// jti aleatório: cada refresh token é único (mesmo se gerado no mesmo segundo)
		const refreshToken = this.jwtService.sign(
			{ sub: user.id.toString(), email: user.email, jti: randomUUID() },
			{ expiresIn: RefreshJwtConfig.expiresIn, secret: RefreshJwtConfig.secret },
		);

		const hashedToken = this.cryptService.hashToken(refreshToken);
		await this.userService.updateRefreshToken(user.id, hashedToken);

		return refreshToken;
	}

	// Troca um refresh token válido por um novo par de tokens (rotação)
	async refreshTokens(refreshToken: string) {
		let payload: TokenPayload;

		try {
			payload = this.jwtService.verify<TokenPayload>(refreshToken, {
				secret: RefreshJwtConfig.secret,
			});
		} catch {
			throw new UnauthorizedException('Invalid refresh token');
		}

		const user = await this.userService.getUserById(payload.sub).catch(() => null);

		if (
			!user ||
			!user.active ||
			!user.refreshToken ||
			!this.cryptService.compareToken(refreshToken, user.refreshToken)
		) {
			throw new UnauthorizedException('Invalid refresh token');
		}

		const access_token = this.jwtService.sign(
			{ sub: user.id.toString(), email: user.email },
			{ expiresIn: '1h' },
		);
		const refresh_token = await this.createRefreshToken(user);

		return { access_token, refresh_token };
	}

	async logout(userId: string) {
		return this.userService.logout(userId);
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
