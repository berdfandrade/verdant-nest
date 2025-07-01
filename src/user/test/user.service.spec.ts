import mongoose from 'mongoose';
import { mockUser } from './mock/user.mock';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { UserController } from '../user.controller';
import { NotFoundException } from '@nestjs/common';
import { User, UserSchema } from '../user.schema';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CryptService } from '../../security/crypt.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { ConflictException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from '../../auth/auth.module';
import { mock } from 'node:test';

let mongoServer: MongoMemoryServer;
let userService: UserService;
let authService: AuthService;
let cryptService: CryptService;
let userModel: Model<User>;

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = mongoServer.getUri();
	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [
			MongooseModule.forRoot(mongoUri),
			MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
			AuthModule,
		],
		providers: [UserService, CryptService, AuthService, JwtService],
		controllers: [UserController],
	}).compile();

	userService = moduleFixture.get<UserService>(UserService);
	cryptService = moduleFixture.get<CryptService>(CryptService);
	authService = moduleFixture.get<AuthService>(AuthService);
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
			expect(userService.create(createUserDto)).rejects.toThrow(ConflictException);
		});

		describe('🔑 hashPassword', () => {
			it('user must have the password hashed', async () => {
				const createUserDto: CreateUserDto = { ...mockUser };
				const user = await userService.create(createUserDto);

				await expect(
					cryptService.comparePasswords(mockUser.password, user.password),
				).resolves.toBe(true);
			});
		});
	});

	// describe('🔐 Token', () => {
	// 	it('should return an access token after valid credentials', async () => {
	// 		const hashedPassword = await cryptService.hashPassword(mockUser.password);
	// 		await userModel.create({ ...mockUser, password: hashedPassword });

	// 		const loginDto = {
	// 			email: mockUser.email,
	// 			password: mockUser.password,
	// 		};

	// 		// Realiza login
	// 		const response = await authService.validateAndLogin(loginDto);

	// 		// Verificações
	// 		expect(response).toHaveProperty('access_token');
	// 		console.log(response['access_token']);
	// 		expect(response.user).toMatchObject({
	// 			email: mockUser.email,
	// 		});
	// 	});

	// 	it('should create a refresh token', async () => {

	// 		const hashedPassword = await cryptService.hashPassword(mockUser.password);
	// 		await userModel.create({ ...mockUser, password: hashedPassword });

	// 		const loginDto = {
	// 			email: mockUser.email,
	// 			password: mockUser.password,
	// 		};

	// 		// Realiza login
	// 		const response = await authService.validateAndLogin(loginDto);
	// 	});
	// });

	describe('🔍 getUserById', () => {
		it('should return a user by ID', async () => {
			const createdUser = await userService.create(mockUser);
			const foundUser = await userService.getUserById(createdUser.id);
			expect(foundUser).toBeDefined();
			expect(foundUser.email).toBe(mockUser.email);
		});

		it('should throw NotFoundException if user does not exist', async () => {
			const fakeId = new mongoose.Types.ObjectId();
			await expect(userService.getUserById(fakeId)).rejects.toThrow(NotFoundException);
		});
	});

	describe('📜 findAll', () => {
		it('should return all users', async () => {
			await userService.create(mockUser);
			const users = await userService.findAll();
			expect(users.length).toBe(1);
			expect(users[0].email).toBe(mockUser.email);
		});

		it('should return an empty array if no users exist', async () => {
			const users = await userService.findAll();
			expect(users).toEqual([]);
		});
	});

	describe('✏️ updateUser', () => {
		it('should update user data', async () => {
			const createdUser = await userService.create(mockUser);
			const updated = await userService.updateUser(createdUser.id, {
				username: 'UpdatedName',
			});

			expect(updated).toBeDefined();
			expect(updated.username).toBe('UpdatedName');
		});

		it('should hash password if updated', async () => {
			const createdUser = await userService.create(mockUser);
			const updated = await userService.updateUser(createdUser.id, {
				password: 'newPassword123',
			});

			const isMatch = await cryptService.comparePasswords(
				'newPassword123',
				updated.password,
			);
			expect(isMatch).toBe(true);
		});

		it('should throw NotFoundException if user not found', async () => {
			const fakeId = new mongoose.Types.ObjectId();
			await expect(
				userService.updateUser(fakeId, { username: 'NotFound' }),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe('🗑️ deleteUser', () => {
		it('should delete a user', async () => {
			const createdUser = await userService.create(mockUser);
			await userService.deleteUser(createdUser.id);

			const found = await userModel.findById(createdUser.id);
			expect(found).toBeNull();
		});

		it('should throw NotFoundException if user does not exist', async () => {
			const fakeId = new mongoose.Types.ObjectId();
			await expect(userService.deleteUser(fakeId)).rejects.toThrow(NotFoundException);
		});
	});
});
