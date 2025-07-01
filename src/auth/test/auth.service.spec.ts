import { INestApplication, UnauthorizedException } from '@nestjs/common';
import mongoose, { Model } from 'mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../user/user.service';
import { AuthService } from '../auth.service';
import { AuthDto } from '../dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { CryptService } from '../../security/crypt.service';
import { User, UserSchema } from '../../user/user.schema';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mockUser } from '../../user/test/mock/user.mock';
import { JwtModule } from '@nestjs/jwt';
import { SetupTestApp } from '../../../test/test-setup';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let authService: AuthService;
let userService: UserService;
let cryptService: CryptService;
let jwtService: JwtService;
let userModel: Model<User>;

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	authService = moduleFixture.get<AuthService>(AuthService);
	userService = moduleFixture.get<UserService>(UserService);
	cryptService = moduleFixture.get<CryptService>(CryptService);
	jwtService = moduleFixture.get<JwtService>(JwtService);
	userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
	// await userModel.ensureIndexes();
});

beforeEach(async () => {
	await userModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

describe('🔐 AuthService', () => {
	it('❗ should be defined', () => {
		expect(authService).toBeDefined();
	});

	describe('✅ validateAndLogin', () => {
		it('should return access token and user if credentials are valid', async () => {
			const hashedPassword = await cryptService.hashPassword(mockUser.password);
			await userModel.create({ ...mockUser, password: hashedPassword });

			const authDto: AuthDto = { email: mockUser.email, password: mockUser.password };
			const result = await authService.validateAndLogin(authDto);

			expect(result).toBeDefined();
			expect(result.access_token).toEqual(expect.any(String));
			expect(result.user).toEqual({
				id: expect.any(String),
				email: mockUser.email,
			});
		});

		it('should throw UnauthorizedException if user is not found', async () => {
			const authDto: AuthDto = { email: 'nonexistent@example.com', password: 'password' };
			await expect(authService.validateAndLogin(authDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});

		it('should throw UnauthorizedException if password is invalid', async () => {
			const hashedPassword = await cryptService.hashPassword(mockUser.password);
			await userModel.create({ ...mockUser, password: hashedPassword });

			const authDto: AuthDto = { email: mockUser.email, password: 'wrongPassword' };
			await expect(authService.validateAndLogin(authDto)).rejects.toThrow(
				UnauthorizedException,
			);
		});
	});

	describe('🔁 createRefreshToken', () => {
		it('should return a refresh token and save its hash', async () => {
			const hashedPassword = await cryptService.hashPassword(mockUser.password);
			const createdUser = await userModel.create({
				...mockUser,
				password: hashedPassword,
			});

			const refreshToken = await authService.createRefreshToken(createdUser);

			expect(refreshToken).toEqual(expect.any(String));

			const updatedUser = await userModel.findById(createdUser._id);
			expect(updatedUser?.refreshToken).toBeDefined();
		});
	});
});
