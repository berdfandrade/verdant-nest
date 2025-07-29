import { MongooseModule } from "@nestjs/mongoose";
import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminSchema } from "./admin.schema";
import { Admin } from "./admin.schema";
import { CryptModule } from "src/security/crypt.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
    CryptModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService, MongooseModule],
})
export class AdminModule {}
