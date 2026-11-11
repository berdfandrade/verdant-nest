import mongoose from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ProfileService, birthDateRangeFromAges } from '@/profile/profile.service';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { SetupTestApp } from '@test/test-setup';
import { User } from '@/user/user.schema';
import { UserService } from '@/user/user.service';
import { mockUser, mockUserMaria } from '@/user/test/mock/user.mock';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { LikesService } from '@/likes/likes.service';

let app: INestApplication;
let mongoServer: MongoMemoryServer;

let profileService: ProfileService;
let userService: UserService;
let likesService: LikesService;

let userModel: Model<User>;

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	profileService = moduleFixture.get(ProfileService);
	userService = moduleFixture.get(UserService);
	likesService = moduleFixture.get(LikesService);
	userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
	await userModel.createIndexes(); // força a criação do índice 2dsphere antes dos testes ($geoNear)
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

	describe('🧭 feed (showMeProfiles)', () => {
		it('should not show sensitive fields in the feed', async () => {
			const user1 = await userService.create(mockUser);
			await userService.create(mockUserMaria);

			const [maria] = await profileService.showMeProfiles(user1.id);

			expect(maria.fullName).toBe(mockUserMaria.fullName);
			expect(maria.distance).toEqual(expect.any(Number));
			expect(maria.password).toBeUndefined();
			expect(maria.email).toBeUndefined();
			expect(maria.phoneNumber).toBeUndefined();
			expect(maria.likedProfiles).toBeUndefined();
		});

		it('should not show profiles I already liked', async () => {
			const user1 = await userService.create(mockUser);
			const user2 = await userService.create(mockUserMaria);

			await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

			const usersNearby = await profileService.showMeProfiles(user1.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should not show profiles I passed', async () => {
			const user1 = await userService.create(mockUser);
			const user2 = await userService.create(mockUserMaria);

			await likesService.passProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

			const usersNearby = await profileService.showMeProfiles(user1.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should not show inactive (banned) profiles', async () => {
			const user1 = await userService.create(mockUser);
			const user2 = await userService.create(mockUserMaria);

			await userService.setStatus(user2.id, { active: false });

			const usersNearby = await profileService.showMeProfiles(user1.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should respect the age range preference', async () => {
			const user1 = await userService.create({
				...mockUser,
				preferences: { ...mockUser.preferences, ageRange: [18, 20] },
			});
			await userService.create(mockUserMaria); // nascida em 1998

			const usersNearby = await profileService.showMeProfiles(user1.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should respect the max distance preference', async () => {
			const user1 = await userService.create(mockUser);
			// ~430km de distância (Rio de Janeiro)
			await userService.create({
				...mockUserMaria,
				location: { type: 'Point', coordinates: [-43.1729, -22.9068] },
			});

			const usersNearby = await profileService.showMeProfiles(user1.id);
			expect(usersNearby.length).toBe(0);
		});
	});

	describe('📍 users without location', () => {
		it('should throw NotFoundException if I have no location yet', async () => {
			const { location, ...withoutLocation } = mockUser;
			const user = await userService.create(withoutLocation);

			await expect(profileService.showMeProfiles(user.id)).rejects.toThrow(NotFoundException);
		});

		it('should show the feed after I send my location', async () => {
			const { location, ...withoutLocation } = mockUser;
			const user = await userService.create(withoutLocation);
			await userService.create(mockUserMaria);

			await profileService.updateLocation(user.id, { longitude: -46.6333, latitude: -23.5515 });

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.length).toBe(1);
		});

		it('should not show profiles without location in the feed', async () => {
			const user = await userService.create(mockUser);
			const { location, ...mariaWithoutLocation } = mockUserMaria;
			await userService.create(mariaWithoutLocation);

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.length).toBe(0);
		});
	});

	describe('🎂 birthDateRangeFromAges', () => {
		it('should convert an age range to a birth date range', () => {
			const now = new Date('2026-06-15T12:00:00Z');
			const range = birthDateRangeFromAges(25, 35, now);

			expect(range.$lte?.getUTCFullYear()).toBe(2001);
			expect(range.$gt?.getUTCFullYear()).toBe(1990);
		});

		it('should return an empty object without ages', () => {
			expect(birthDateRangeFromAges()).toEqual({});
		});
	});

	describe('⚙️ updates', () => {
		it('should change my preferences keeping the other ones', async () => {
			const user = await userService.create(mockUser);

			const response = await profileService.changeMyConfigs(user.id, {
				distance: '5',
				advancedFilters: { smoking: ['Yes'] },
			});
			expect(response.message).toBe('Preferences updated successfully');

			const preferences = await profileService.showMeMyPreferences(user.id);
			expect(preferences.distance).toBe('5');
			expect(preferences.ageRange).toEqual(mockUser.preferences!.ageRange);
			expect(preferences.advancedFilters?.smoking).toEqual(['Yes']);
			expect(preferences.advancedFilters?.religion).toEqual(
				mockUser.preferences!.advancedFilters!.religion,
			);
		});

		it('should change my about section keeping the other fields', async () => {
			const user = await userService.create(mockUser);

			await profileService.changeAboutMe(user.id, { zodiacSign: 'Leo' });

			const aboutMe = await profileService.showMeAboutMe(user.id);
			expect(aboutMe.zodiacSign).toBe('Leo');
			expect(aboutMe.height).toBe(mockUser.about!.height);
		});

		it('should update my location', async () => {
			const user = await userService.create(mockUser);

			const response = await profileService.updateLocation(user.id, {
				longitude: -43.9378,
				latitude: -19.9208,
			});

			expect(response.location?.coordinates).toEqual([-43.9378, -19.9208]);
		});
	});
});
