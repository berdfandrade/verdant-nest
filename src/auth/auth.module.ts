import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { CryptService } from '../security/crypt.service';
import { CryptModule } from '../security/crypt.module'; // Importando o módulo que fornece o CryptService

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET, // Lembre-se de definir esse segredo em .env
            signOptions: { expiresIn: '1h' },
        }),
        UserModule, // UserModule já importa o UserService
        CryptModule, // CryptModule deve ser importado, não CryptService diretamente
    ],
    providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        CryptService, // CryptService aqui, porque é um provider do CryptModule
    ],
    exports: [AuthService], // Exportando AuthService para ser usado em outros módulos
})
export class AuthModule {}
