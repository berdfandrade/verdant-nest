import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import mongoose, { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SetupTestApp } from '../../../test/test-setup';
import { User } from '../../user/user.schema';
import { UserService } from '../../user/user.service';
import { mockUser } from '../../user/test/mock/user.mock';
import { AuthDto } from '../dto/auth.dto';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let userService: UserService;
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
	userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
});

beforeEach(async () => {
	await userModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

describe('🔒 AuthController (e2e)', () => {
	describe('POST /login', () => {
		it('should return 200 with tokens for valid credentials', async () => {
			await userService.create(mockUser);

			const response = await request(app.getHttpServer()).post('/login').send(CREDENTIALS);

			expect(response.status).toBe(200);
			expect(response.body.access_token).toEqual(expect.any(String));
			expect(response.body.refresh_token).toEqual(expect.any(String));
			expect(response.body.user.email).toBe(CREDENTIALS.email);
		});

		it('should return 401 for wrong password', async () => {
			await userService.create(mockUser);

			const response = await request(app.getHttpServer())
				.post('/login')
				.send({ ...CREDENTIALS, password: 'wrongPassword' });

			expect(response.status).toBe(401);
		});

		it('should return 400 for an invalid email', async () => {
			const response = await request(app.getHttpServer())
				.post('/login')
				.send({ email: 'not-an-email', password: '123' });

			expect(response.status).toBe(400);
		});
	});

	describe('GET /login/auth_ping', () => {
		it('should return the logged user', async () => {
			const user = await userService.create(mockUser);
			const login = await request(app.getHttpServer()).post('/login').send(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.get('/login/auth_ping')
				.set('Authorization', `Bearer ${login.body.access_token}`);

			expect(response.status).toBe(200);
			expect(response.body.Message.id).toBe(user.id);
		});

		it('should return 401 without token', async () => {
			const response = await request(app.getHttpServer()).get('/login/auth_ping');
			expect(response.status).toBe(401);
		});

		it('should return 401 if the user was deleted', async () => {
			const user = await userService.create(mockUser);
			const login = await request(app.getHttpServer()).post('/login').send(CREDENTIALS);
			await userService.deleteUser(user.id);

			const response = await request(app.getHttpServer())
				.get('/login/auth_ping')
				.set('Authorization', `Bearer ${login.body.access_token}`);

			expect(response.status).toBe(401);
		});
	});

	describe('POST /login/refresh', () => {
		it('should return new tokens', async () => {
			await userService.create(mockUser);
			const login = await request(app.getHttpServer()).post('/login').send(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.post('/login/refresh')
				.send({ refresh_token: login.body.refresh_token });

			expect(response.status).toBe(200);
			expect(response.body.access_token).toEqual(expect.any(String));
			expect(response.body.refresh_token).toEqual(expect.any(String));
		});

		it('should return 400 if refresh_token is not a JWT', async () => {
			const response = await request(app.getHttpServer())
				.post('/login/refresh')
				.send({ refresh_token: 'abc' });

			expect(response.status).toBe(400);
		});
	});

	describe('POST /login/logout', () => {
		it('should logout and invalidate the refresh token', async () => {
			await userService.create(mockUser);
			const login = await request(app.getHttpServer()).post('/login').send(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.post('/login/logout')
				.set('Authorization', `Bearer ${login.body.access_token}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toBe('Logout successful');

			const refresh = await request(app.getHttpServer())
				.post('/login/refresh')
				.send({ refresh_token: login.body.refresh_token });

			expect(refresh.status).toBe(401);
		});
	});
});
