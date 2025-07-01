import { INestApplication,} from '@nestjs/common';
import * as request from 'supertest';
import mongoose from 'mongoose';
import { mockUser } from '../../user/test/mock/user.mock';
import { Model } from 'mongoose';
import { User } from '../../user/user.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Conversation } from '../schemas/conversation.schema';
import { UserService } from '../../user/user.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConversationService } from '../conversation.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { SetupTestApp } from '../../../test/test-setup';
import { AuthService } from '../../auth/auth.service';
import { AuthDto } from '../../auth/dto/auth.dto';


let app: INestApplication;
let mongoServer: MongoMemoryServer;
let conversationService: ConversationService;
let userService: UserService;
let conversationModel: Model<Conversation>;
let userModel: Model<User>;
let authService : AuthService

const CREDENTIALS : AuthDto = {
	email : 'bernardo@example.com',
	password : 'securePass123'
}

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;

	conversationService = moduleFixture.get(ConversationService);
	userService = moduleFixture.get(UserService);
	authService = moduleFixture.get(AuthService)
	conversationModel = moduleFixture.get<Model<Conversation>>(getModelToken(Conversation.name));
	userModel = moduleFixture.get(getModelToken(User.name))
	
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await conversationModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	if (app) await app.close();
});

describe('ConversationController (e2e)', () => {
	it('should return 200 if the user is in the conversation', async () => {

		const user = await userService.create(mockUser);
		const loginResponse = await authService.validateAndLogin(CREDENTIALS)
		const token = loginResponse.access_token
		const otherUserId = new mongoose.Types.ObjectId();

		const mockConversation: CreateConversationDto = {
			participants: [user.id, otherUserId],
		};

		const conversation = await conversationService.create(mockConversation);

		const response = await request(app.getHttpServer())
			.get(`/conversations/${conversation.id}`)
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
	});
});
