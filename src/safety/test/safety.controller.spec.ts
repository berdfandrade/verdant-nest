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
import { Report } from '../report.schema';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let userService: UserService;
let authService: AuthService;
let userModel: Model<User>;
let reportModel: Model<Report>;

const CREDENTIALS: AuthDto = {
	email: 'bernardo@example.com',
	password: 'securePass123',
};

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	userService = moduleFixture.get(UserService);
	authService = moduleFixture.get(AuthService);
	userModel = moduleFixture.get(getModelToken(User.name));
	reportModel = moduleFixture.get(getModelToken(Report.name));
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await reportModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

const setup = async () => {
	await userService.create(mockUser);
	const maria = await userService.create(mockUserMaria);
	const { access_token } = await authService.validateAndLogin(CREDENTIALS);
	return { maria, token: access_token };
};

describe('🛡️ SafetyController (e2e)', () => {
	it('should return 401 without token', async () => {
		const response = await request(app.getHttpServer()).get('/safety/blocked');
		expect(response.status).toBe(401);
	});

	it('POST /safety/block/:userId, GET /safety/blocked and DELETE /safety/block/:userId', async () => {
		const { maria, token } = await setup();
		const server = app.getHttpServer();

		const block = await request(server).post(`/safety/block/${maria.id}`).set('Authorization', `Bearer ${token}`);
		expect(block.status).toBe(200);
		expect(block.body.blocked).toBe(true);

		const list = await request(server).get('/safety/blocked').set('Authorization', `Bearer ${token}`);
		expect(list.status).toBe(200);
		expect(list.body.map((u: any) => u._id)).toEqual([maria.id]);
		expect(list.body[0].email).toBeUndefined();

		const unblock = await request(server).delete(`/safety/block/${maria.id}`).set('Authorization', `Bearer ${token}`);
		expect(unblock.status).toBe(200);
		expect(unblock.body.blocked).toBe(false);
	});

	it('POST /likes should return 403 after blocking', async () => {
		const { maria, token } = await setup();
		const server = app.getHttpServer();

		await request(server).post(`/safety/block/${maria.id}`).set('Authorization', `Bearer ${token}`).expect(200);

		const like = await request(server)
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({ profileToBeLikedId: maria.id });

		expect(like.status).toBe(403);
	});

	it('POST /safety/report should create a report', async () => {
		const { maria, token } = await setup();

		const response = await request(app.getHttpServer())
			.post('/safety/report')
			.set('Authorization', `Bearer ${token}`)
			.send({ userId: maria.id, reason: 'harassment', details: 'Mensagens ofensivas' });

		expect(response.status).toBe(201);
		expect(response.body).toMatchObject({ reported: true, blocked: true });
		expect(await reportModel.countDocuments()).toBe(1);
	});

	it('POST /safety/report should validate the reason', async () => {
		const { maria, token } = await setup();

		const response = await request(app.getHttpServer())
			.post('/safety/report')
			.set('Authorization', `Bearer ${token}`)
			.send({ userId: maria.id, reason: 'não gostei' });

		expect(response.status).toBe(400);
	});

	it('POST /safety/block should return 404 for an unknown user', async () => {
		const { token } = await setup();

		const response = await request(app.getHttpServer())
			.post(`/safety/block/${new mongoose.Types.ObjectId()}`)
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(404);
	});
});
