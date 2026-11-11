import { Global, Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "../user/user.module";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PassportModule } from "@nestjs/passport";
import { CryptModule } from "../security/crypt.module";
import {JwtConfig } from "../config/jwt.config";
import { AdminModule } from "../admin/admin.module";
import { AdminAuthProvider } from "./admin-auth.provider";
import { AdminJwtGuard } from "./admin-jwt.guard";

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({ secret: JwtConfig.secret, signOptions: JwtConfig.signOptions }),
    }),
    UserModule,
    CryptModule,
    AdminModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, AdminAuthProvider, AdminJwtGuard],
  controllers: [AuthController],
  exports: [AuthService, 'JWT_ADMIN_SERVICE', JwtModule, AdminJwtGuard],
})
export class AuthModule {}
