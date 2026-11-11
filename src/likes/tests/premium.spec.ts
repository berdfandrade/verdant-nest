import { HttpStatus, INestApplication, NotFoundException } from '@nestjs/common';
import * as request from 'supertest';
import mongoose, { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SetupTestApp } from '@test/test-setup';
import { User } from '@/user/user.schema';
import { UserService } from '@/user/user.service';
import { AuthService } from '@/auth/auth.service';
import { AuthDto } from '@/auth/dto/auth.dto';
import { ProfileService } from '@/profile/profile.service';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { mockUser, mockUserMaria } from '@/user/test/mock/user.mock';
import { LikesService, SUPER_LIKES_PER_DAY } from '../likes.service';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let likesService: LikesService;
let userService: UserService;
let authService: AuthService;
let profileService: ProfileService;
let userModel: Model<User>;

const CREDENTIALS: AuthDto = { email: 'bernardo@example.com', password: 'securePass123' }; // premium
const MARIA_CREDENTIALS: AuthDto = { email: 'maria@example.com', password: 'safePassword456' }; // free

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	likesService = moduleFixture.get(LikesService);
	userService = moduleFixture.get(UserService);
	authService = moduleFixture.get(AuthService);
	profileService = moduleFixture.get(ProfileService);
	userModel = moduleFixture.get(getModelToken(User.name));
	await userModel.createIndexes();
});

beforeEach(async () => {
	await userModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

// Bernardo premium sem filtros avançados (os filtros não são o assunto aqui)
const premiumBernardo = () =>
	userService.create({ ...mockUser, preferences: { ...mockUser.preferences, advancedFilters: {} } });

// Variações da Maria com e-mail/telefone próprios
const mariaN = (n: number, overrides: Partial<CreateUserDto> = {}) =>
	userService.create({ ...mockUserMaria, email: `maria${n}@example.com`, phoneNumber: `+553198888${String(n).padStart(4, '0')}`, ...overrides });

const has = (list: unknown[] | undefined, id: string) => (list ?? []).some(item => String(item) === id);

describe('⭐ Premium (LikesService)', () => {
	describe('🌟 superLike', () => {
		it('should like and highlight me for the other person', async () => {
			const bernardo = await premiumBernardo();
			const maria = await userService.create(mockUserMaria);

			const result = await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });

			expect(result).toMatchObject({ liked: true, superLike: true, match: false, superLikesLeft: SUPER_LIKES_PER_DAY - 1 });

			const updatedMaria = await userModel.findById(maria.id);
			expect(has(updatedMaria!.likedYouProfiles, bernardo.id)).toBe(true);
			expect(has(updatedMaria!.superLikedBy, bernardo.id)).toBe(true);
		});

		it('should show super likes first, flagged, in the received likes', async () => {
			const maria = await userService.create(mockUserMaria);
			const ana = await mariaN(1, { fullName: 'Ana' });
			const bernardo = await premiumBernardo();

			// Ana curte primeiro (like comum), Bernardo depois com super like
			await likesService.likeProfile({ myProfileId: ana.id, profileToBeLikedId: maria.id });
			await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });

			const received = await likesService.getLikesReceived(maria.id);

			expect(received.map(p => [p.fullName, p.superLike])).toEqual([
				[mockUser.fullName, true],
				['Ana', false],
			]);
		});

		it(`should allow only ${SUPER_LIKES_PER_DAY} super likes every 24h`, async () => {
			const bernardo = await premiumBernardo();
			const targets = await Promise.all(
				Array.from({ length: SUPER_LIKES_PER_DAY + 1 }, (_, i) => mariaN(i + 1)),
			);

			for (const target of targets.slice(0, SUPER_LIKES_PER_DAY)) {
				await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: target.id });
			}

			await expect(
				likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: targets.at(-1)!.id }),
			).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
		});

		it('should not count super likes older than 24h', async () => {
			const bernardo = await premiumBernardo();
			const maria = await userService.create(mockUserMaria);
			const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
			await userModel.updateOne({ _id: bernardo.id }, { superLikeHistory: Array(SUPER_LIKES_PER_DAY).fill(old) });

			const result = await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });

			expect(result.superLikesLeft).toBe(SUPER_LIKES_PER_DAY - 1);
			// O histórico antigo é descartado
			expect((await userModel.findById(bernardo.id))!.superLikeHistory.length).toBe(1);
		});

		it('should upgrade a normal like to a super like', async () => {
			const bernardo = await premiumBernardo();
			const maria = await userService.create(mockUserMaria);
			await likesService.likeProfile({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });

			const result = await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });

			expect(result.superLike).toBe(true);
			const updatedMaria = await userModel.findById(maria.id);
			expect(updatedMaria!.likedYouProfiles.filter(id => String(id) === bernardo.id).length).toBe(1);
			expect(has(updatedMaria!.superLikedBy, bernardo.id)).toBe(true);
		});

		it('should not spend a super like on an existing match', async () => {
			const bernardo = await premiumBernardo();
			const maria = await userService.create(mockUserMaria);
			await likesService.likeProfile({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });
			await likesService.likeProfile({ myProfileId: maria.id, profileToBeLikedId: bernardo.id });

			const result = await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });

			expect(result).toMatchObject({ superLike: false, superLikesLeft: SUPER_LIKES_PER_DAY });
		});

		it('should match right away if the other person already liked me', async () => {
			const bernardo = await premiumBernardo();
			const maria = await userService.create(mockUserMaria);
			await likesService.likeProfile({ myProfileId: maria.id, profileToBeLikedId: bernardo.id });

			const result = await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });

			expect(result.match).toBe(true);
			expect(result.conversationId).toBeDefined();
			expect(has((await userModel.findById(maria.id))!.superLikedBy, bernardo.id)).toBe(false);
		});

		it('should remove the highlight when it becomes a match or is undone', async () => {
			const bernardo = await premiumBernardo();
			const maria = await userService.create(mockUserMaria);
			const ana = await mariaN(1);

			await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });
			await likesService.likeProfile({ myProfileId: maria.id, profileToBeLikedId: bernardo.id }); // match
			expect(has((await userModel.findById(maria.id))!.superLikedBy, bernardo.id)).toBe(false);

			await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: ana.id });
			await likesService.unlikeProfile({ myProfileId: bernardo.id, profileToBeLikedId: ana.id });
			expect(has((await userModel.findById(ana.id))!.superLikedBy, bernardo.id)).toBe(false);
		});
	});

	describe('📊 getSuperLikeStatus', () => {
		it('should count the last 24h and tell when the next one frees up', () => {
			const now = new Date('2026-06-15T12:00:00Z');
			const history = [new Date('2026-06-14T10:00:00Z'), new Date('2026-06-15T08:00:00Z'), new Date('2026-06-15T11:00:00Z')];

			const status = likesService.getSuperLikeStatus(history, now);

			expect(status).toEqual({
				limit: SUPER_LIKES_PER_DAY,
				used: 2,
				left: SUPER_LIKES_PER_DAY - 2,
				nextResetAt: new Date('2026-06-16T08:00:00Z'),
			});
		});
	});

	describe('⏪ rewindLastPass', () => {
		it('should undo the passes from the most recent', async () => {
			const bernardo = await premiumBernardo();
			const maria = await userService.create(mockUserMaria);
			const ana = await mariaN(1, { fullName: 'Ana' });

			await likesService.passProfile({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });
			await likesService.passProfile({ myProfileId: bernardo.id, profileToBeLikedId: ana.id });

			expect((await likesService.rewindLastPass(bernardo.id)).profile?.fullName).toBe('Ana');
			expect((await likesService.rewindLastPass(bernardo.id)).profile?.fullName).toBe(mockUserMaria.fullName);
			await expect(likesService.rewindLastPass(bernardo.id)).rejects.toThrow(NotFoundException);
		});

		it('should put the profile back in the feed', async () => {
			const bernardo = await premiumBernardo();
			const maria = await userService.create(mockUserMaria);

			await likesService.passProfile({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });
			expect((await profileService.showMeProfiles(bernardo.id)).length).toBe(0);

			await likesService.rewindLastPass(bernardo.id);
			expect((await profileService.showMeProfiles(bernardo.id)).length).toBe(1);
		});
	});
});

describe('⭐ Premium routes (e2e)', () => {
	const login = async (credentials: AuthDto) => (await authService.validateAndLogin(credentials)).access_token;

	it('should return 403 for free users', async () => {
		const bernardo = await premiumBernardo();
		await userService.create(mockUserMaria);
		const token = await login(MARIA_CREDENTIALS);
		const server = app.getHttpServer();

		const superLike = await request(server).post('/likes/super').set('Authorization', `Bearer ${token}`).send({ profileToBeLikedId: bernardo.id });
		const status = await request(server).get('/likes/super').set('Authorization', `Bearer ${token}`);
		const rewind = await request(server).post('/likes/rewind').set('Authorization', `Bearer ${token}`);

		expect([superLike.status, status.status, rewind.status]).toEqual([403, 403, 403]);
		expect(superLike.body.message).toBe('This is a premium feature');
	});

	it('should return 401 without token', async () => {
		const response = await request(app.getHttpServer()).post('/likes/rewind');
		expect(response.status).toBe(401);
	});

	it('POST /likes/super and GET /likes/super for premium users', async () => {
		await premiumBernardo();
		const maria = await userService.create(mockUserMaria);
		const token = await login(CREDENTIALS);
		const server = app.getHttpServer();

		const response = await request(server)
			.post('/likes/super')
			.set('Authorization', `Bearer ${token}`)
			.send({ profileToBeLikedId: maria.id });

		expect(response.status).toBe(201);
		expect(response.body).toMatchObject({ liked: true, superLike: true });

		const status = await request(server).get('/likes/super').set('Authorization', `Bearer ${token}`);
		expect(status.body).toMatchObject({ limit: SUPER_LIKES_PER_DAY, used: 1, left: SUPER_LIKES_PER_DAY - 1 });
	});

	it('GET /likes/received should flag super likes (still open to free users)', async () => {
		const bernardo = await premiumBernardo();
		const maria = await userService.create(mockUserMaria);
		await likesService.superLike({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });
		const token = await login(MARIA_CREDENTIALS);

		const response = await request(app.getHttpServer()).get('/likes/received').set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body).toEqual([expect.objectContaining({ _id: bernardo.id, superLike: true })]);
		expect(response.body[0].password).toBeUndefined();
	});

	it('POST /likes/rewind should restore the last pass', async () => {
		await premiumBernardo();
		const maria = await userService.create(mockUserMaria);
		const token = await login(CREDENTIALS);
		const server = app.getHttpServer();

		await request(server).post('/likes/pass').set('Authorization', `Bearer ${token}`).send({ profileToBeLikedId: maria.id }).expect(201);

		const response = await request(server).post('/likes/rewind').set('Authorization', `Bearer ${token}`);
		expect(response.status).toBe(200);
		expect(response.body.profile._id).toBe(maria.id);

		const again = await request(server).post('/likes/rewind').set('Authorization', `Bearer ${token}`);
		expect(again.status).toBe(404);
	});
});
