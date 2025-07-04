import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { mockUser, mockUserMaria } from '../../user/test/mock/user.mock';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { User, } from '../../user/user.schema';
import { getModelToken} from '@nestjs/mongoose';
import {  LikesService } from '../likes.service';
import { UserService } from '../../user/user.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthService } from '../../auth/auth.service';
import { AuthDto } from '../../auth/dto/auth.dto';
import { SetupTestApp } from '../../../test/test-setup';

let app: INestApplication;
let mongoServer : MongoMemoryServer
let likesService: LikesService;
let userService: UserService;
let userModel: Model<User>;
let authService : AuthService

const CREDENTIALS : AuthDto = {
	email : 'bernardo@example.com',
	password : 'securePass123'
}

beforeAll(async () => {
	const {app : testApp, moduleFixture, mongoServer : server} = await SetupTestApp()

	app = testApp
	mongoServer = server; 
	// jwtService = moduleFixture.get<JwtService>(JwtService);
	userService = moduleFixture.get<UserService>(UserService);
	userModel = moduleFixture.get(getModelToken(User.name));
	likesService = moduleFixture.get<LikesService>(LikesService);
	authService = moduleFixture.get<AuthService>(AuthService)


});

beforeEach(async () => {
	await userModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close()
});

describe('❤️  LikesController (e2e)', () => {
	it('Should return 200 if the user liked other user', async () => {

		const user = await userService.create(mockUser);
		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token
		const user2 = await userService.create(mockUserMaria);

		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({
				myProfileId: user.id,
				profileToBeLikedId: user2.id,
			});

		expect(response.status).toBe(201);
		expect(response.body.liked).toBe(true);
		expect(response.body.match).toBe(false);
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
				myProfileId: user.id,
				profileToBeLikedId: user2.id,
			});

		expect(response.status).toBe(201);
		expect(response.body.liked).toBe(false);
		expect(response.body.alreadyLiked).toBe(true);
	});

	it('Should create a match when both users like each other', async () => {
		const userA = await userService.create(mockUser);
		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token
		const userB = await userService.create(mockUserMaria);

		// A dá like em B primeiro
		await likesService.likeProfile({
			myProfileId: userA.id,
			profileToBeLikedId: userB.id,
		});

		// B dá like em A e gera o match
		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({
				myProfileId: userB.id,
				profileToBeLikedId: userA.id,
			});

		expect(response.status).toBe(201);
		expect(response.body.liked).toBe(true);
		expect(response.body.match).toBe(true);
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
				myProfileId: user.id,
				profileToBeLikedId: user2.id,
			});

		expect(response.status).toBe(201);
		expect(response.body.unliked).toBe(true);
	});

	it('Should return 404 if user does not exist', async () => {
		const user = await userService.create(mockUser);

		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token

		const fakeId = new mongoose.Types.ObjectId().toString();

		const response = await request(app.getHttpServer())
			.post('/likes')
			.set('Authorization', `Bearer ${token}`)
			.send({
				myProfileId: user.id,
				profileToBeLikedId: fakeId,
			});

		expect(response.status).toBe(404);
		expect(response.body.message).toContain('User does not exist');
	});
});
