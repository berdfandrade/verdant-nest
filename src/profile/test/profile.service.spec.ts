import mongoose from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ProfileService, birthDateRangeFromAges } from '@/profile/profile.service';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { SetupTestApp } from '@test/test-setup';
import { User } from '@/user/user.schema';
import { UserService } from '@/user/user.service';
import { mockUser, mockUserFree, mockUserMaria } from '@/user/test/mock/user.mock';
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
		const userDto: CreateUserDto = mockUserFree;
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
			const user1 = await userService.create(mockUserFree);
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
			const user1 = await userService.create(mockUserFree);
			const user2 = await userService.create(mockUserMaria);

			await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

			const usersNearby = await profileService.showMeProfiles(user1.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should not show profiles I passed', async () => {
			const user1 = await userService.create(mockUserFree);
			const user2 = await userService.create(mockUserMaria);

			await likesService.passProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

			const usersNearby = await profileService.showMeProfiles(user1.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should not show inactive (banned) profiles', async () => {
			const user1 = await userService.create(mockUserFree);
			const user2 = await userService.create(mockUserMaria);

			await userService.setStatus(user2.id, { active: false });

			const usersNearby = await profileService.showMeProfiles(user1.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should respect the age range preference', async () => {
			const user1 = await userService.create({
				...mockUserFree,
				preferences: { ...mockUserFree.preferences, ageRange: [18, 20] },
			});
			await userService.create(mockUserMaria); // nascida em 1998

			const usersNearby = await profileService.showMeProfiles(user1.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should respect the max distance preference', async () => {
			const user1 = await userService.create(mockUserFree);
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
			const { location, ...withoutLocation } = mockUserFree;
			const user = await userService.create(withoutLocation);
			await userService.create(mockUserMaria);

			await profileService.updateLocation(user.id, { longitude: -46.6333, latitude: -23.5515 });

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.length).toBe(1);
		});

		it('should not show profiles without location in the feed', async () => {
			const user = await userService.create(mockUserFree);
			const { location, ...mariaWithoutLocation } = mockUserMaria;
			await userService.create(mariaWithoutLocation);

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.length).toBe(0);
		});
	});

	describe('🎯 gender and advanced filters', () => {
		// Variações da Maria com e-mail/telefone próprios
		const maria = (overrides: Partial<CreateUserDto>, n = 1): CreateUserDto => ({
			...mockUserMaria,
			email: `maria${n}@example.com`,
			phoneNumber: `+553198888000${n}`,
			...overrides,
		});

		it('should only show genders I want to see', async () => {
			const user = await userService.create(mockUserFree); // Male, quer women/non-binary
			await userService.create(maria({ fullName: 'João', gender: 'Male', showMe: ['women'] }));

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should not show people who do not want to see my gender (mutual)', async () => {
			const user = await userService.create(mockUserFree);
			await userService.create(maria({ showMe: ['women'] })); // Female que só quer mulheres

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should show everyone when showMe is "everyone"', async () => {
			const user = await userService.create({ ...mockUserFree, showMe: ['everyone'] });
			await userService.create(maria({ fullName: 'João', gender: 'Male', showMe: ['everyone'] }, 1));
			await userService.create(maria({ showMe: ['men'] }, 2));

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.length).toBe(2);
		});

		it('should apply advanced filters for premium users (rigid)', async () => {
			// mockUser é premium e exige verificado, 170-190cm, Libra/Gêmeos... a Maria não bate
			const user = await userService.create(mockUser);
			await userService.create(mockUserMaria);

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.length).toBe(0);
		});

		it('should show premium users the profiles that match their filters', async () => {
			const user = await userService.create({
				...mockUser,
				preferences: {
					...mockUser.preferences,
					advancedFilters: {
						height: [160, 170],
						education: ['Bachelor'], // casa com "Bachelor in Design"
						religion: ['Spiritual'],
						smoking: ['No'],
					},
				},
			});
			await userService.create(mockUserMaria);

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.map(u => u.fullName)).toEqual([mockUserMaria.fullName]);
		});

		it('should ignore advanced filters for free users', async () => {
			// Mesmos filtros restritivos do mockUser, mas sem premium
			const user = await userService.create(mockUserFree);
			await userService.create(mockUserMaria);

			const usersNearby = await profileService.showMeProfiles(user.id);
			expect(usersNearby.length).toBe(1);
		});

		it('should hide profiles without the filtered field when a premium filter is set', async () => {
			const user = await userService.create({
				...mockUser,
				preferences: { ...mockUser.preferences, advancedFilters: { religion: ['Spiritual'] } },
			});
			const { religion, ...aboutWithoutReligion } = mockUserMaria.about!;
			await userService.create(maria({ about: aboutWithoutReligion }));

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
