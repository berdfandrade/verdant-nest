import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SetupTestApp } from '@test/test-setup';
import { buildCorsOptions, parseOrigins } from '../cors.config';

describe('🌐 CORS config', () => {
	it('should parse a comma separated list (ignoring spaces and trailing slashes)', () => {
		expect(parseOrigins(' https://verdant.app/ , https://admin.verdant.app ,')).toEqual([
			'https://verdant.app',
			'https://admin.verdant.app',
		]);
		expect(parseOrigins(undefined)).toEqual([]);
	});

	it('should allow only the listed origins', () => {
		const options = buildCorsOptions({ CORS_ORIGINS: 'https://verdant.app', NODE_ENV: 'production' });
		expect(options.origin).toEqual(['https://verdant.app']);
	});

	it('should allow every origin with "*"', () => {
		expect(buildCorsOptions({ CORS_ORIGINS: '*', NODE_ENV: 'production' }).origin).toBe(true);
	});

	it('should block browser origins in production when CORS_ORIGINS is missing', () => {
		expect(buildCorsOptions({ NODE_ENV: 'production' }).origin).toBe(false);
	});

	it('should allow any origin outside production when CORS_ORIGINS is missing', () => {
		expect(buildCorsOptions({ NODE_ENV: 'development' }).origin).toBe(true);
		expect(buildCorsOptions({ NODE_ENV: 'test' }).origin).toBe(true);
	});
});

describe('🌐 CORS with CORS_ORIGINS (e2e)', () => {
	const ALLOWED = 'https://verdant.app';
	const BLOCKED = 'https://site-malicioso.example';
	// Handshake do Socket.IO (transporte polling, que passa pelo CORS)
	const SOCKET_HANDSHAKE = '/socket.io/?EIO=4&transport=polling';

	let app: INestApplication;
	let mongoServer: MongoMemoryServer;

	beforeAll(async () => {
		process.env.CORS_ORIGINS = ALLOWED;
		const setup = await SetupTestApp();
		app = setup.app;
		mongoServer = setup.mongoServer;
	});

	afterAll(async () => {
		delete process.env.CORS_ORIGINS;
		await mongoose.disconnect();
		await mongoServer.stop();
		await app.close();
	});

	describe('🔌 WebSocket', () => {
		it('should allow the configured origin', async () => {
			const response = await request(app.getHttpServer()).get(SOCKET_HANDSHAKE).set('Origin', ALLOWED);

			expect(response.status).toBe(200);
			expect(response.headers['access-control-allow-origin']).toBe(ALLOWED);
		});

		it('should not allow other origins', async () => {
			const response = await request(app.getHttpServer()).get(SOCKET_HANDSHAKE).set('Origin', BLOCKED);

			expect(response.headers['access-control-allow-origin']).toBeUndefined();
		});

		it('should still work without Origin (native apps)', async () => {
			const response = await request(app.getHttpServer()).get(SOCKET_HANDSHAKE);

			expect(response.status).toBe(200);
			expect(response.text).toContain('"sid"');
		});
	});

	describe('🌍 HTTP', () => {
		it('should answer the preflight for the configured origin', async () => {
			const response = await request(app.getHttpServer())
				.options('/login')
				.set('Origin', ALLOWED)
				.set('Access-Control-Request-Method', 'POST');

			expect(response.status).toBe(204);
			expect(response.headers['access-control-allow-origin']).toBe(ALLOWED);
		});

		it('should not allow other origins', async () => {
			const response = await request(app.getHttpServer())
				.options('/login')
				.set('Origin', BLOCKED)
				.set('Access-Control-Request-Method', 'POST');

			expect(response.headers['access-control-allow-origin']).toBeUndefined();
		});
	});
});
