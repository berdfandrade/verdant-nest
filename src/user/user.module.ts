import { MongooseModule } from "@nestjs/mongoose";
import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { UserSchema, User } from "./user.schema";
import { UserService } from "./user.service";
import { CryptModule } from "../security/crypt.module";

@Module({
    imports : [
        MongooseModule.forFeature([{name : User.name, schema : UserSchema}]),
        CryptModule
    ],
    controllers : [UserController],
    providers : [UserService],
    exports : [UserService]
})

export class UserModule{}