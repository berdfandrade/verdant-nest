import mongoose from "mongoose";
import { Model } from "mongoose";
import { Test, TestingModule } from '@nestjs/testing';
import { LikesService } from "../likes.service";
import { UserModule } from "../../user/user.module";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../../user/user.schema";
import { UserService } from "../../user/user.service";
import { LikesModule } from "../likes.module";

let mongoServer : MongoMemoryServer;
let likesService : LikesService;
let userService : UserService; 
let userModel : Model<User>

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri(); 

    const moduleFixture : TestingModule = await Test.createTestingModule({
        imports : [
            MongooseModule.forRoot(mongoUri),
            MongooseModule.forFeature([
                { name : User.name, schema: UserSchema },
            ]),
            UserModule,
            LikesModule
        ]
    }).compile()

    likesService = moduleFixture.get<LikesService>(LikesService)
    userService = moduleFixture.get<UserService>(UserService)
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name))
})

beforeEach(async () => {
    await userModel.deleteMany({})
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
})

describe('LikesService', () => {
    it('should be defined', () => {
        expect(likesService).toBeDefined()
    })
})