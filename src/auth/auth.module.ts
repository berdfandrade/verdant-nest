import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "../user/user.module";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PassportModule } from "@nestjs/passport";
import { CryptService } from "../security/crypt.service";
import { CryptModule } from "../security/crypt.module";
import {JwtConfig } from "../config/jwt.config";
import { AdminModule } from "src/admin/admin.module";
import { AdminAuthProvider } from "./admin-auth.provider";
import { AdminJwtGuard } from "./admin-jwt.guard";

@Module({
  imports: [
    PassportModule,
    JwtModule.register(JwtConfig),
    UserModule,
    CryptModule,
    AdminModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, CryptService, AdminAuthProvider, AdminJwtGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
