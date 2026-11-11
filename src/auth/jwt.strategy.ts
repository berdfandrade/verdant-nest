import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';
import { JwtConfig } from '../config/jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private userService: UserService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			// Mesma secret usada para assinar o access token
			secretOrKey: JwtConfig.secret,
		});
	}

	async validate(payload: any) {
		try {
			const user = await this.userService.getUserById(payload.sub);
			// Usuário banido/desativado não acessa rotas protegidas
			if (!user.active) return null;
			return user;
		} catch {
			return null;
		}
	}
}
