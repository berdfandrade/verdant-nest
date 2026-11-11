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
import { Admin } from '@/admin/admin.schema';
import { AdminService } from '@/admin/admin.service';
import { mockAdmin } from './mock/admin.mock';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let userService: UserService;
let authService: AuthService;
let adminService: AdminService;
let userModel: Model<User>;
let adminModel: Model<Admin>;

const CREDENTIALS: AuthDto = {
	email: 'bernardo@example.com',
	password: 'securePass123',
};

const ADMIN_CREDENTIALS: AuthDto = {
	email: mockAdmin.email,
	password: mockAdmin.password,
};

beforeAll(async () => {
	process.env.ADMIN_SECRET_KEY = mockAdmin.adminSecret;

	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	userService = moduleFixture.get(UserService);
	authService = moduleFixture.get(AuthService);
	adminService = moduleFixture.get(AdminService);
	userModel = moduleFixture.get(getModelToken(User.name));
	adminModel = moduleFixture.get(getModelToken(Admin.name));
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await adminModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

const adminToken = async () => {
	await adminService.create(mockAdmin);
	return (await authService.adminLogin(ADMIN_CREDENTIALS)).access_token;
};

describe('👑 AdminController (e2e)', () => {
	describe('🆕 POST /admin', () => {
		it('should create an admin with the right secret and hide the password', async () => {
			const response = await request(app.getHttpServer()).post('/admin').send(mockAdmin);

			expect(response.status).toBe(201);
			expect(response.body.email).toBe(mockAdmin.email);
			expect(response.body.password).toBeUndefined();
			expect(response.body.adminSecret).toBeUndefined();
		});

		it('should return 400 with the wrong secret', async () => {
			const response = await request(app.getHttpServer())
				.post('/admin')
				.send({ ...mockAdmin, adminSecret: 'wrong' });

			expect(response.status).toBe(400);
		});

		it('should return 409 if the admin email already exists', async () => {
			await adminService.create(mockAdmin);
			const response = await request(app.getHttpServer()).post('/admin').send(mockAdmin);

			expect(response.status).toBe(409);
		});
	});

	describe('🔐 Admin auth', () => {
		it('POST /login/admin should return an admin token', async () => {
			await adminService.create(mockAdmin);

			const response = await request(app.getHttpServer())
				.post('/login/admin')
				.send(ADMIN_CREDENTIALS);

			expect(response.status).toBe(200);
			expect(response.body.access_token).toEqual(expect.any(String));
		});

		it('GET /admin should return 401 without token', async () => {
			const response = await request(app.getHttpServer()).get('/admin');
			expect(response.status).toBe(401);
		});

		it('GET /admin should return 401 with a normal user token', async () => {
			await userService.create(mockUser);
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);

			const response = await request(app.getHttpServer())
				.get('/admin')
				.set('Authorization', `Bearer ${access_token}`);

			expect(response.status).toBe(401);
		});

		it('GET /admin should return 200 with an admin token', async () => {
			const token = await adminToken();

			const response = await request(app.getHttpServer())
				.get('/admin')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
		});
	});

	describe('👥 User management', () => {
		it('GET /admin/users should list users without passwords', async () => {
			await userService.create(mockUser);
			await userService.create(mockUserMaria);
			const token = await adminToken();

			const response = await request(app.getHttpServer())
				.get('/admin/users')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.total).toBe(2);
			expect(response.body.users[0].password).toBeUndefined();
		});

		it('GET /users should work for admins', async () => {
			await userService.create(mockUser);
			const token = await adminToken();

			const response = await request(app.getHttpServer())
				.get('/users')
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.length).toBe(1);
		});

		it('PATCH /admin/users/:id/ban should block the user login', async () => {
			const user = await userService.create(mockUser);
			const token = await adminToken();

			const response = await request(app.getHttpServer())
				.patch(`/admin/users/${user.id}/ban`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(response.body.active).toBe(false);

			const login = await request(app.getHttpServer()).post('/login').send(CREDENTIALS);
			expect(login.status).toBe(401);
		});

		it('PATCH /admin/users/:id/ban should invalidate tokens already issued', async () => {
			const user = await userService.create(mockUser);
			const { access_token } = await authService.validateAndLogin(CREDENTIALS);
			const token = await adminToken();

			await request(app.getHttpServer())
				.patch(`/admin/users/${user.id}/ban`)
				.set('Authorization', `Bearer ${token}`)
				.expect(200);

			const response = await request(app.getHttpServer())
				.get('/users/me')
				.set('Authorization', `Bearer ${access_token}`);

			expect(response.status).toBe(401);
		});

		it('PATCH /admin/users/:id/unban and /verify', async () => {
			const user = await userService.create({ ...mockUser, verified: false });
			const token = await adminToken();

			await adminService.banUser(user._id as mongoose.Types.ObjectId);

			const unban = await request(app.getHttpServer())
				.patch(`/admin/users/${user.id}/unban`)
				.set('Authorization', `Bearer ${token}`);
			expect(unban.body.active).toBe(true);

			const verify = await request(app.getHttpServer())
				.patch(`/admin/users/${user.id}/verify`)
				.set('Authorization', `Bearer ${token}`);
			expect(verify.body.verified).toBe(true);
		});

		it('PATCH /admin/users/:id/premium should grant and remove premium', async () => {
			const user = await userService.create({ ...mockUserMaria });
			const token = await adminToken();
			const server = app.getHttpServer();

			const grant = await request(server)
				.patch(`/admin/users/${user.id}/premium`)
				.set('Authorization', `Bearer ${token}`)
				.send({ premium: true });
			expect(grant.status).toBe(200);
			expect(grant.body.premium).toBe(true);

			const invalid = await request(server)
				.patch(`/admin/users/${user.id}/premium`)
				.set('Authorization', `Bearer ${token}`)
				.send({ premium: 'yes' });
			expect(invalid.status).toBe(400);

			const remove = await request(server)
				.patch(`/admin/users/${user.id}/premium`)
				.set('Authorization', `Bearer ${token}`)
				.send({ premium: false });
			expect(remove.body.premium).toBe(false);
		});

		it('DELETE /admin/users/:id should delete the user', async () => {
			const user = await userService.create(mockUser);
			const token = await adminToken();

			const response = await request(app.getHttpServer())
				.delete(`/admin/users/${user.id}`)
				.set('Authorization', `Bearer ${token}`);

			expect(response.status).toBe(200);
			expect(await userModel.findById(user.id)).toBeNull();
		});

		it('GET /admin/stats should count users', async () => {
			await userService.create(mockUser); // premium e verified
			await userService.create(mockUserMaria);
			const token = await adminToken();

			const response = await request(app.getHttpServer())
				.get('/admin/stats')
				.set('Authorization', `Bearer ${token}`);

			expect(response.body).toEqual({ users: 2, activeUsers: 2, premiumUsers: 1, verifiedUsers: 1 });
		});
	});
});
