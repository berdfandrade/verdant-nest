import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import mongoose, { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdtemp, readdir, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SetupTestApp } from '@test/test-setup';
import { NOT_AN_IMAGE, PNG_1PX } from '@test/fixtures/images';
import { User } from '@/user/user.schema';
import { UserService } from '@/user/user.service';
import { AuthService } from '@/auth/auth.service';
import { AuthDto } from '@/auth/dto/auth.dto';
import { mockUser } from '@/user/test/mock/user.mock';
import { MAX_PHOTOS, MAX_PHOTO_SIZE_BYTES } from '../photos.service';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let userService: UserService;
let authService: AuthService;
let userModel: Model<User>;
let uploadsDir: string;

const CREDENTIALS: AuthDto = {
	email: 'bernardo@example.com',
	password: 'securePass123',
};

beforeAll(async () => {
	// Driver local numa pasta temporária (lida em tempo de execução pelo StorageModule)
	uploadsDir = await mkdtemp(join(tmpdir(), 'verdant-photos-'));
	process.env.UPLOADS_DIR = uploadsDir;
	delete process.env.STORAGE_DRIVER;

	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	userService = moduleFixture.get(UserService);
	authService = moduleFixture.get(AuthService);
	userModel = moduleFixture.get(getModelToken(User.name));
});

beforeEach(async () => {
	await userModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
	await rm(uploadsDir, { recursive: true, force: true });
});

const login = async () => (await authService.validateAndLogin(CREDENTIALS)).access_token;

const upload = (token: string, body: Buffer = PNG_1PX, filename = 'foto.png') =>
	request(app.getHttpServer())
		.post('/profile/photos')
		.set('Authorization', `Bearer ${token}`)
		.attach('photo', body, { filename, contentType: 'image/png' });

const filesOf = async (userId: string) => readdir(join(uploadsDir, 'users', userId)).catch(() => [] as string[]);

describe('📸 Profile photos (e2e)', () => {
	it('should return 401 without token', async () => {
		const response = await request(app.getHttpServer()).post('/profile/photos').attach('photo', PNG_1PX, 'foto.png');
		expect(response.status).toBe(401);
	});

	it('should upload a photo, store the file and serve it', async () => {
		const user = await userService.create(mockUser); // já tem 2 fotos (links externos)
		const token = await login();

		const response = await upload(token);

		expect(response.status).toBe(201);
		expect(response.body.length).toBe(mockUser.photos!.length + 1);

		const photo = response.body.at(-1);
		expect(photo.url).toMatch(new RegExp(`^/uploads/users/${user.id}/[0-9a-f-]{36}\\.png$`));
		expect(photo.key).toBeDefined();
		expect(await filesOf(user.id)).toHaveLength(1);

		// A própria API serve o arquivo
		const served = await request(app.getHttpServer()).get(photo.url);
		expect(served.status).toBe(200);
		expect(served.body).toEqual(PNG_1PX);
	});

	it('should reject files that are not images, even if they say they are', async () => {
		const user = await userService.create(mockUser);
		const token = await login();

		const response = await upload(token, NOT_AN_IMAGE, 'fake.png');

		expect(response.status).toBe(400);
		expect(response.body.message).toContain('JPEG, PNG or WEBP');
		expect(await filesOf(user.id)).toHaveLength(0);
	});

	it('should return 400 when no file is sent', async () => {
		await userService.create(mockUser);
		const token = await login();

		const response = await request(app.getHttpServer())
			.post('/profile/photos')
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(400);
	});

	it('should return 413 for files over the size limit', async () => {
		await userService.create(mockUser);
		const token = await login();

		const tooBig = Buffer.concat([PNG_1PX, Buffer.alloc(MAX_PHOTO_SIZE_BYTES)]);
		const response = await upload(token, tooBig);

		expect(response.status).toBe(413);
	});

	it(`should not allow more than ${MAX_PHOTOS} photos`, async () => {
		const user = await userService.create({ ...mockUser, photos: [] });
		const token = await login();

		for (let i = 0; i < MAX_PHOTOS; i++) {
			await upload(token).expect(201);
		}

		const response = await upload(token);

		expect(response.status).toBe(400);
		expect(response.body.message).toContain(`${MAX_PHOTOS}`);
		expect(await filesOf(user.id)).toHaveLength(MAX_PHOTOS);
	});

	it('should delete an uploaded photo and its file', async () => {
		const user = await userService.create({ ...mockUser, photos: [] });
		const token = await login();
		const [photo] = (await upload(token)).body;

		const response = await request(app.getHttpServer())
			.delete(`/profile/photos/${photo._id}`)
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body).toEqual([]);
		await expect(stat(join(uploadsDir, photo.key))).rejects.toThrow();
		expect(await filesOf(user.id)).toHaveLength(0);
	});

	it('should delete an external photo (url only) without touching the storage', async () => {
		const user = await userService.create(mockUser);
		const token = await login();
		const [externalPhoto] = (await userModel.findById(user.id))!.photos;

		const response = await request(app.getHttpServer())
			.delete(`/profile/photos/${externalPhoto._id}`)
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body.map((p: any) => p.url)).not.toContain(externalPhoto.url);
	});

	it('should return 404 for a photo that is not mine', async () => {
		await userService.create(mockUser);
		const token = await login();

		const response = await request(app.getHttpServer())
			.delete(`/profile/photos/${new mongoose.Types.ObjectId()}`)
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(404);
	});

	it('should set a photo as the main one (first position)', async () => {
		await userService.create(mockUser);
		const token = await login();
		const uploaded = (await upload(token)).body.at(-1);

		const response = await request(app.getHttpServer())
			.patch(`/profile/photos/${uploaded._id}/main`)
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body[0]._id).toBe(uploaded._id);
		expect(response.body).toHaveLength(mockUser.photos!.length + 1);
	});
});
