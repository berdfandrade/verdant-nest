import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import mongoose, { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SetupTestApp } from '@test/test-setup';
import { User } from '@/user/user.schema';
import { UserService } from '@/user/user.service';
import { AuthService } from '@/auth/auth.service';
import { mockUser } from '@/user/test/mock/user.mock';
import { RATE_LIMITS } from '../rate-limit.config';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let userService: UserService;
let authService: AuthService;
let userModel: Model<User>;

const WRONG_LOGIN = { email: 'bernardo@example.com', password: 'senhaErrada' };

// Cada teste usa um "IP" próprio, para os contadores não se misturarem
let ipCounter = 0;
const nextIp = () => `10.0.0.${++ipCounter}`;

beforeAll(async () => {
	process.env.RATE_LIMIT_ENABLED = 'true';

	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	userService = moduleFixture.get(UserService);
	authService = moduleFixture.get(AuthService);
	userModel = moduleFixture.get(getModelToken(User.name));

	// Como em produção atrás de proxy (TRUST_PROXY): o IP vem do X-Forwarded-For
	app.getHttpAdapter().getInstance().set('trust proxy', true);
});

beforeEach(async () => {
	await userModel.deleteMany({});
	process.env.RATE_LIMIT_ENABLED = 'true';
});

afterAll(async () => {
	delete process.env.RATE_LIMIT_ENABLED;
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

describe('🚦 Rate limiting (e2e)', () => {
	it(`POST /login should allow ${RATE_LIMITS.login.limit} attempts per minute, then 429`, async () => {
		await userService.create(mockUser);
		const ip = nextIp();

		for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
			await request(app.getHttpServer()).post('/login').set('X-Forwarded-For', ip).send(WRONG_LOGIN).expect(401);
		}

		const blocked = await request(app.getHttpServer()).post('/login').set('X-Forwarded-For', ip).send(WRONG_LOGIN);

		expect(blocked.status).toBe(429);
		expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
	});

	it('should count each IP separately', async () => {
		await userService.create(mockUser);
		const ip = nextIp();

		for (let i = 0; i < RATE_LIMITS.login.limit; i++) {
			await request(app.getHttpServer()).post('/login').set('X-Forwarded-For', ip).send(WRONG_LOGIN);
		}

		// Outro IP continua podendo tentar
		const otherIp = await request(app.getHttpServer()).post('/login').set('X-Forwarded-For', nextIp()).send(WRONG_LOGIN);
		expect(otherIp.status).toBe(401);
	});

	it('should not affect other routes when the login is blocked', async () => {
		await userService.create(mockUser);
		const { access_token } = await authService.validateAndLogin({ email: mockUser.email, password: mockUser.password });
		const ip = nextIp();

		for (let i = 0; i <= RATE_LIMITS.login.limit; i++) {
			await request(app.getHttpServer()).post('/login').set('X-Forwarded-For', ip).send(WRONG_LOGIN);
		}

		const me = await request(app.getHttpServer())
			.get('/users/me')
			.set('X-Forwarded-For', ip)
			.set('Authorization', `Bearer ${access_token}`);

		expect(me.status).toBe(200);
	});

	it(`POST /users should allow ${RATE_LIMITS.signup.limit} sign-ups per hour, then 429`, async () => {
		const ip = nextIp();

		// Corpos inválidos também contam: o limite vem antes da validação
		for (let i = 0; i < RATE_LIMITS.signup.limit; i++) {
			await request(app.getHttpServer()).post('/users').set('X-Forwarded-For', ip).send({}).expect(400);
		}

		const blocked = await request(app.getHttpServer()).post('/users').set('X-Forwarded-For', ip).send({});
		expect(blocked.status).toBe(429);
	});

	it('should do nothing when RATE_LIMIT_ENABLED=false', async () => {
		process.env.RATE_LIMIT_ENABLED = 'false';
		await userService.create(mockUser);
		const ip = nextIp();

		for (let i = 0; i < RATE_LIMITS.login.limit + 3; i++) {
			await request(app.getHttpServer()).post('/login').set('X-Forwarded-For', ip).send(WRONG_LOGIN).expect(401);
		}
	});
});
