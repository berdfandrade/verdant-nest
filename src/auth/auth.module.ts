import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { CryptService } from '../security/crypt.service';
import { CryptModule } from '../security/crypt.module';

@Module({
	imports: [
		PassportModule,
		JwtModule.register({
			secret: process.env.JWT_SECRET,
			signOptions: { expiresIn: '1h' },
		}),
		UserModule,
		CryptModule,
	],
	providers: [AuthService, JwtStrategy, JwtAuthGuard, CryptService],
	exports: [AuthService],
})
export class AuthModule {}
