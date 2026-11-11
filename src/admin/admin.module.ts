import { MongooseModule } from "@nestjs/mongoose";
import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminSchema } from "./admin.schema";
import { Admin } from "./admin.schema";
import { CryptModule } from "../security/crypt.module";
import { AdminController } from "./admin.controller";
import { UserModule } from "../user/user.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    CryptModule,
    UserModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService, MongooseModule],
})
export class AdminModule {}
