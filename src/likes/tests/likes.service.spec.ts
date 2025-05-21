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
import { mockUser, mockUserMaria } from "../../user/test/mock/user.mock";
import { CreateUserDto } from "../../user/dto/create-user.dto";
import { ILikeProfile } from "../likes.service";

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

describe('❤️  LikesService', () => {
    it('should be defined', () => {
        expect(likesService).toBeDefined()
    })

    it('a USER Should like another USER', async () => {

        const dto : CreateUserDto = mockUser
        const dto2 : CreateUserDto = mockUserMaria

        const user = await userService.create(dto)
        const user2 = await userService.create(dto2)

        const likeObj : ILikeProfile = {
            myProfileId : user.id,
            profileToBeLikedId : user2.id
        }

        const likeUser = await likesService.likeProfile(likeObj)

        expect(likeUser.liked).toBe(true)

    })
})
