import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { mockUser, mockUserMaria } from '@/user/test/mock/user.mock';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { User, } from '@/user/user.schema';
import { getModelToken} from '@nestjs/mongoose';
import {  LikesService } from '@/likes/likes.service';
import { UserService } from '@/user/user.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthService } from '@/auth/auth.service';
import { AuthDto } from '@/auth/dto/auth.dto';
import { SetupTestApp } from '@test/test-setup';
import { Conversation } from '@/conversation/schemas/conversation.schema';

let app: INestApplication;
let mongoServer : MongoMemoryServer
let likesService: LikesService;
let userService: UserService;
let userModel: Model<User>;
let conversationModel: Model<Conversation>;
let authService : AuthService

const CREDENTIALS : AuthDto = {
	email : 'bernardo@example.com',
	password : 'securePass123'
}

const MARIA_CREDENTIALS : AuthDto = {
	email : 'maria@example.com',
	password : 'safePassword456'
}

beforeAll(async () => {
	const {app : testApp, moduleFixture, mongoServer : server} = await SetupTestApp()

	app = testApp
	mongoServer = server;
	userService = moduleFixture.get<UserService>(UserService);
	userModel = moduleFixture.get(getModelToken(User.name));
	conversationModel = moduleFixture.get(getModelToken(Conversation.name));
	likesService = moduleFixture.get<LikesService>(LikesService);
	authService = moduleFixture.get<AuthService>(AuthService)
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await conversationModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close()
});

describe('❤️  LikesController (e2e)', () => {
	it('Should return 401 without token', async () => {
		const response = await request(app.getHttpServer())
			.post('/likes')
			.send({ profileToBeLikedId: new mongoose.Types.ObjectId().toString() });

		expect(response.status).toBe(401);
	});

	it('Should return 200 if the user liked other user', async () => {

		const user = await userService.create(mockUser);
		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token
		const user2 = await userService.create(mockUserMaria);

		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({
				profileToBeLikedId: user2.id,
			});

		expect(response.status).toBe(201);
		expect(response.body.liked).toBe(true);
		expect(response.body.match).toBe(false);

		const updatedUser = await userService.getUserById(user.id);
		expect(updatedUser.likedProfiles.some(id => id.toString() === user2.id)).toBe(true);
	});

	it('Should use the logged user even if myProfileId is sent in the body', async () => {
		const user = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);
		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token

		// Bernardo tenta forjar um like da Maria nele mesmo.
		// O myProfileId do body é ignorado -> vira um auto-like do Bernardo -> 400
		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({
				myProfileId: user2.id,
				profileToBeLikedId: user.id,
			});

		expect(response.status).toBe(400);

		const maria = await userService.getUserById(user2.id);
		expect(maria.likedProfiles.some(id => id.toString() === user.id)).toBe(false);
	});

	it('Should return 400 when liking yourself', async () => {
		const user = await userService.create(mockUser);
		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token

		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({ profileToBeLikedId: user.id });

		expect(response.status).toBe(400);
	});

	it('Should return 400 if profileToBeLikedId is not a valid id', async () => {
		await userService.create(mockUser);
		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token

		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({ profileToBeLikedId: 'not-an-id' });

		expect(response.status).toBe(400);
	});

	it('Should return alreadyLiked if like was sent again', async () => {

		const user = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token


		await likesService.likeProfile({
			myProfileId: user.id,
			profileToBeLikedId: user2.id,
		});

		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({
				profileToBeLikedId: user2.id,
			});

		expect(response.status).toBe(201);
		expect(response.body.liked).toBe(false);
		expect(response.body.alreadyLiked).toBe(true);
	});

	it('Should create a match when both users like each other', async () => {
		const userA = await userService.create(mockUser);
		const userB = await userService.create(mockUserMaria);

		// A dá like em B primeiro
		await likesService.likeProfile({
			myProfileId: userA.id,
			profileToBeLikedId: userB.id,
		});

		// B (logada) dá like em A e gera o match
		const loginResponse = await authService.validateAndLogin(MARIA_CREDENTIALS)
		const token = loginResponse.access_token

		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({
				profileToBeLikedId: userA.id,
			});

		expect(response.status).toBe(201);
		expect(response.body.liked).toBe(true);
		expect(response.body.match).toBe(true);
		expect(response.body.conversationId).toEqual(expect.any(String));
	});

	it('Should unlike a user successfully', async () => {
		const user = await userService.create(mockUser);
		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token
		const user2 = await userService.create(mockUserMaria);

		await likesService.likeProfile({
			myProfileId: user.id,
			profileToBeLikedId: user2.id,
		});

		const response = await request(app.getHttpServer())
			.post('/likes/unlike')
			.set('Authorization', `Bearer ${token}`)
			.send({
				profileToBeLikedId: user2.id,
			});

		expect(response.status).toBe(201);
		expect(response.body.unliked).toBe(true);
	});

	it('Should pass a user', async () => {
		const user = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);
		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token

		const response = await request(app.getHttpServer())
			.post('/likes/pass')
			.set('Authorization', `Bearer ${token}`)
			.send({ profileToBeLikedId: user2.id });

		expect(response.status).toBe(201);
		expect(response.body.passed).toBe(true);

		const updatedUser = await userService.getUserById(user.id);
		expect(updatedUser.passedProfiles.some(id => id.toString() === user2.id)).toBe(true);
	});

	it('Should list my matches', async () => {
		const userA = await userService.create(mockUser);
		const userB = await userService.create(mockUserMaria);

		await likesService.likeProfile({ myProfileId: userA.id, profileToBeLikedId: userB.id });
		await likesService.likeProfile({ myProfileId: userB.id, profileToBeLikedId: userA.id });

		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token

		const response = await request(app.getHttpServer())
			.get('/likes/matches')
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body.length).toBe(1);
		expect(response.body[0]._id).toBe(userB.id);
		expect(response.body[0].fullName).toBe(mockUserMaria.fullName);
		expect(response.body[0].password).toBeUndefined();
		expect(response.body[0].email).toBeUndefined();
	});

	it('Should list who liked me', async () => {
		const userA = await userService.create(mockUser);
		const userB = await userService.create(mockUserMaria);

		// Maria curte o Bernardo
		await likesService.likeProfile({ myProfileId: userB.id, profileToBeLikedId: userA.id });

		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token

		const response = await request(app.getHttpServer())
			.get('/likes/received')
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body.map(u => u._id)).toContain(userB.id);
	});

	it('Should return 404 if user does not exist', async () => {
		await userService.create(mockUser);

		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token

		const fakeId = new mongoose.Types.ObjectId().toString();

		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({
				profileToBeLikedId: fakeId,
			});

		expect(response.status).toBe(404);
		expect(response.body.message).toContain('User does not exist');
	});
});
