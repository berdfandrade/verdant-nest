import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import mongoose, { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SetupTestApp } from '@test/test-setup';
import { User } from '@/user/user.schema';
import { UserService } from '@/user/user.service';
import { AuthService } from '@/auth/auth.service';
import { AuthDto } from '@/auth/dto/auth.dto';
import { mockUser, mockUserMaria } from '@/user/test/mock/user.mock';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let userService: UserService;
let authService: AuthService;
let userModel: Model<User>;

const CREDENTIALS: AuthDto = {
	email: 'bernardo@example.com',
	password: 'securePass123',
};

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	userService = moduleFixture.get<UserService>(UserService);
	authService = moduleFixture.get<AuthService>(AuthService);
	userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
	await userModel.createIndexes(); // índice 2dsphere precisa existir antes do $geoNear
});

beforeEach(async () => {
	await userModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

const login = async () => (await authService.validateAndLogin(CREDENTIALS)).access_token;

describe('🙋 ProfileController (e2e)', () => {
	it('should return 401 without token', async () => {
		const response = await request(app.getHttpServer()).get('/profile/feed');
		expect(response.status).toBe(401);
	});

	it('GET /profile/feed should return nearby profiles', async () => {
		await userService.create(mockUser);
		const maria = await userService.create(mockUserMaria);
		const token = await login();

		const response = await request(app.getHttpServer())
			.get('/profile/feed')
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body.length).toBe(1);
		expect(response.body[0]._id).toBe(maria.id);
	});

	it('GET and PUT /profile/preferences', async () => {
		await userService.create(mockUser);
		const token = await login();

		const update = await request(app.getHttpServer())
			.put('/profile/preferences')
			.set('Authorization', `Bearer ${token}`)
			.send({ distance: '15', ageRange: [30, 40] });

		expect(update.status).toBe(200);

		const response = await request(app.getHttpServer())
			.get('/profile/preferences')
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body.distance).toBe('15');
		expect(response.body.ageRange).toEqual([30, 40]);
	});

	it('PUT /profile/preferences should return 400 for invalid data', async () => {
		await userService.create(mockUser);
		const token = await login();

		const response = await request(app.getHttpServer())
			.put('/profile/preferences')
			.set('Authorization', `Bearer ${token}`)
			.send({ ageRange: 'twenty' });

		expect(response.status).toBe(400);
	});

	it('GET and PUT /profile/about', async () => {
		await userService.create(mockUser);
		const token = await login();

		await request(app.getHttpServer())
			.put('/profile/about')
			.set('Authorization', `Bearer ${token}`)
			.send({ drinking: 'Never' })
			.expect(200);

		const response = await request(app.getHttpServer())
			.get('/profile/about')
			.set('Authorization', `Bearer ${token}`);

		expect(response.body.drinking).toBe('Never');
		expect(response.body.zodiacSign).toBe(mockUser.about!.zodiacSign);
	});

	it('PUT /profile/location should validate coordinates', async () => {
		await userService.create(mockUser);
		const token = await login();

		const invalid = await request(app.getHttpServer())
			.put('/profile/location')
			.set('Authorization', `Bearer ${token}`)
			.send({ longitude: 500, latitude: 10 });

		expect(invalid.status).toBe(400);

		const valid = await request(app.getHttpServer())
			.put('/profile/location')
			.set('Authorization', `Bearer ${token}`)
			.send({ longitude: -43.9378, latitude: -19.9208 });

		expect(valid.status).toBe(200);
		expect(valid.body.location.coordinates).toEqual([-43.9378, -19.9208]);
	});
});
