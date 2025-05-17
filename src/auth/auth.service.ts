import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CryptService } from '../security/crypt.service';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
	constructor(
		private userService: UserService,
		private jwtService: JwtService,
		private cryptService: CryptService,
	) {}

	async validateUser(email: string, password: string) {
		const user = await this.userService.findByEmail(email);
		if (!user) throw new UnauthorizedException('Wrong email or password');

		const isPasswordValid = await this.cryptService.comparePasswords(
			password,
			user.password,
		);

		if (!isPasswordValid) throw new UnauthorizedException('Wrong email or password');

		return user;
	}

	async login(user: any) {
		const payload = { sub: user._id.toString(), email: user.email };

		return {
			access_token: this.jwtService.sign(payload, {
				expiresIn: '1h',
			}),
			user: {
				id: user._id.toString(),
				email: user.email,
			},
		};
	}
}
