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
import { mockUser, mockUserMaria } from './mock/user.mock';

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
});

beforeEach(async () => {
	await userModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

describe('🧑 UserController (e2e)', () => {
	describe('✅ POST /users', () => {
		it('should create a user and never return the password', async () => {
			const response = await request(app.getHttpServer()).post('/users').send(mockUser);

			expect(response.status).toBe(201);
			expect(response.body.email).toBe(mockUser.email);
			expect(response.body.password).toBeUndefined();
			expect(response.body.refreshToken).toBeUndefined();
		});

		it('should return 409 if the email is already registered', async () => {
			await userService.create(mockUser);
			const response = await request(app.getHttpServer()).post('/users').send(mockUser);

			expect(response.status).toBe(409);
		});

		it('should return 400 for an invalid phone number', async () => {
			const response = await request(app.getHttpServer())
				.post('/users')
				.send({ ...mockUser, phoneNumber: '123-abc' });

			expect(response.status).toBe(400);
		});
	});

	describe('🔍 GET /users', () => {
		it('should return 401 for a normal user (admin only)', async () => {
			await userService.create(mockUser);
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.get('/users')
				.set('Authorization', `Bearer ${access_token}`);

			expect(response.status).toBe(401);
		});

		it('should return my own data on /users/me', async () => {
			const user = await userService.create(mockUser);
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.get('/users/me')
				.set('Authorization', `Bearer ${access_token}`);

			expect(response.status).toBe(200);
			expect(response.body._id).toBe(user.id);
			expect(response.body.password).toBeUndefined();
		});

		it('should return 400 for an invalid id', async () => {
			await userService.create(mockUser);
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.get('/users/not-an-id')
				.set('Authorization', `Bearer ${access_token}`);

			expect(response.status).toBe(400);
		});
	});

	describe('✏️ PUT /users/:id', () => {
		it('should update my own user', async () => {
			const user = await userService.create(mockUser);
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.put(`/users/${user.id}`)
				.set('Authorization', `Bearer ${access_token}`)
				.send({ username: 'bernardo_updated' });

			expect(response.status).toBe(200);
			expect(response.body.username).toBe('bernardo_updated');
		});

		it('should return 403 when updating another user', async () => {
			await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.put(`/users/${maria.id}`)
				.set('Authorization', `Bearer ${access_token}`)
				.send({ username: 'hacked' });

			expect(response.status).toBe(403);
		});

		it('should ignore protected fields like premium and matches', async () => {
			const user = await userService.create({ ...mockUser, premium: false, matches: [] });
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);

			const fakeMatch = new mongoose.Types.ObjectId().toString();

			await request(app.getHttpServer())
				.put(`/users/${user.id}`)
				.set('Authorization', `Bearer ${access_token}`)
				.send({ premium: true, matches: [fakeMatch] })
				.expect(200);

			const updated = await userService.getUserById(user.id);
			expect(updated.premium).toBe(false);
			expect(updated.matches.length).toBe(0);
		});
	});

	describe('🗑️ DELETE /users/:id', () => {
		it('should delete my own user', async () => {
			const user = await userService.create(mockUser);
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.delete(`/users/${user.id}`)
				.set('Authorization', `Bearer ${access_token}`);

			expect(response.status).toBe(204);
			expect(await userModel.findById(user.id)).toBeNull();
		});

		it('should return 403 when deleting another user', async () => {
			await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.delete(`/users/${maria.id}`)
				.set('Authorization', `Bearer ${access_token}`);

			expect(response.status).toBe(403);
			expect(await userModel.findById(maria.id)).not.toBeNull();
		});
	});
});
