import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UserModule } from "@/user/user.module";
import { DateInvite, DateInviteSchema } from "./date-invite.schema";
import { DatesService } from "./dates.service";
import { DatesController } from "./dates.controller";

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: DateInvite.name, schema: DateInviteSchema },
    ]),
  ],
  controllers: [DatesController],
  providers: [DatesService],
  exports: [DatesService],
})
export class DatesModule {}
