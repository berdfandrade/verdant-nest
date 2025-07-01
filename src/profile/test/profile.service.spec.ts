import mongoose from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ProfileService } from '../profile.service';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { INestApplication } from '@nestjs/common';
import { SetupTestApp } from '../../../test/test-setup';
import { User } from '../../user/user.schema';
import { UserService } from '../../user/user.service';
import { mockUser, mockUserMaria } from '../../user/test/mock/user.mock';
import { CreateUserDto } from '../../user/dto/create-user.dto';

let app: INestApplication;
let mongoServer: MongoMemoryServer;

let profileService: ProfileService;
let userService: UserService;

let userModel: Model<User>;

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	profileService = moduleFixture.get(ProfileService);
	userService = moduleFixture.get(UserService);
	userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
	// await userModel.ensureIndexes(); // força a criação dos índices antes dos testes
});

beforeEach(async () => {
	await userModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

describe('🙋 ProfileService', () => {
	it('should be defined', () => {
		expect(profileService).toBeDefined();
	});

	it('should show me nearbyProfiles', async () => {
		const userDto: CreateUserDto = mockUser;
		const userDto2: CreateUserDto = mockUserMaria;

		const user1 = await userService.create(userDto);
		const user2 = await userService.create(userDto2);

		const usersNearby = await profileService.showMeProfiles(user1.id);
		expect(usersNearby.length).toBe(1);
	});

	it('should show me my configs', async () => {
		const userDto: CreateUserDto = mockUser;
		const user = await userService.create(userDto);

		const myConfigs = await profileService.showMeMyPreferences(user.id);

		expect(myConfigs).toMatchObject({
			distance: user.preferences.distance,
			ageRange: user.preferences.ageRange,
		});
	});

	it('should show me the about me section', async () => {
		const userDto: CreateUserDto = mockUser;
		const user = await userService.create(userDto);

		const aboutMe = await profileService.showMeAboutMe(user.id);
		expect(aboutMe.zodiacSign).toBe(user.about.zodiacSign);
	});
});
