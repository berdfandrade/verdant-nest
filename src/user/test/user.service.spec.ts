import mongoose from 'mongoose';
import { mockUser } from './mock/user.mock';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { UserController } from '../user.controller';
import { User, UserSchema } from '../user.schema';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CryptService } from '../../security/crypt.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { ConflictException } from '@nestjs/common';

let mongoServer: MongoMemoryServer;
let userService: UserService;
let cryptService: CryptService;
let userModel: Model<User>;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
            MongooseModule.forRoot(mongoUri),
            MongooseModule.forFeature([
                { name: User.name, schema: UserSchema },
            ]),
        ],
        providers: [UserService, CryptService],
        controllers: [UserController],
    }).compile();

    userService = moduleFixture.get<UserService>(UserService);
    cryptService = moduleFixture.get<CryptService>(CryptService);
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
});

beforeEach(async () => {
    await userModel.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('🧑 UserService', () => {
    it('❗ should be defined', () => {
        expect(userService).toBeDefined();
    });

    describe('✅ CreateUser', () => {
        it('should create a new user', async () => {
            const createUserDto: CreateUserDto = mockUser;
            const user = await userService.create(createUserDto);
            expect(user).toBeDefined();
            expect(user.username).toBe(mockUser.username);
        });

        it('should return an error if the email is already registered', async () => {
            const createUserDto: CreateUserDto = mockUser;
            await userService.create(createUserDto);
            expect(userService.create(createUserDto)).rejects.toThrow(
                ConflictException,
            );
        });

        describe('🔑 hashPassword', () => {
            it('user must have the password hashed', async () => {
                const createUserDto: CreateUserDto = { ...mockUser };
                const user = await userService.create(createUserDto);

                await expect(
                    cryptService.comparePasswords(
                        mockUser.password,
                        user.password,
                    ),
                ).resolves.toBe(true);
            });
        });
    });
});
