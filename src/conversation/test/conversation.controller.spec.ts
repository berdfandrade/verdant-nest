import { INestApplication,} from '@nestjs/common';
import * as request from 'supertest';
import mongoose from 'mongoose';
import { mockUser, mockUserMaria } from '@/user/test/mock/user.mock';
import { Model } from 'mongoose';
import { User } from '@/user/user.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Conversation } from '@/conversation/schemas/conversation.schema';
import { UserService } from '@/user/user.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConversationService } from '@/conversation/conversation.service';
import { CreateConversationDto } from '@/conversation/dto/create-conversation.dto';
import { SetupTestApp } from '@test/test-setup';
import { AuthService } from '@/auth/auth.service';
import { AuthDto } from '@/auth/dto/auth.dto';
import { MessagesService } from '@/messages/messages.service';


let app: INestApplication;
let mongoServer: MongoMemoryServer;
let conversationService: ConversationService;
let userService: UserService;
let conversationModel: Model<Conversation>;
let userModel: Model<User>;
let authService : AuthService
let messagesService : MessagesService

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
	messagesService = moduleFixture.get(MessagesService)
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

	it('should return the conversation with populated participants', async () => {
		const user = await userService.create(mockUser);
		const maria = await userService.create(mockUserMaria);
		const { access_token } = await authService.validateAndLogin(CREDENTIALS)

		const conversation = await conversationService.create({ participants: [user.id, maria.id] });

		const response = await request(app.getHttpServer())
			.get(`/conversations/${conversation.id}`)
			.set('Authorization', `Bearer ${access_token}`);

		expect(response.status).toBe(200);
		expect(response.body._id).toBe(conversation.id);
		const names = response.body.participants.map(p => p.fullName);
		expect(names).toEqual(expect.arrayContaining([mockUser.fullName, mockUserMaria.fullName]));
		expect(response.body.participants[0].password).toBeUndefined();
	});

	it('should return 403 if the user is NOT in the conversation', async () => {
		await userService.create(mockUser);
		const { access_token } = await authService.validateAndLogin(CREDENTIALS)

		const conversation = await conversationService.create({
			participants: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
		});

		const response = await request(app.getHttpServer())
			.get(`/conversations/${conversation.id}`)
			.set('Authorization', `Bearer ${access_token}`);

		expect(response.status).toBe(403);
	});

	it('should return 401 without token', async () => {
		const conversation = await conversationService.create({
			participants: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
		});

		const response = await request(app.getHttpServer()).get(`/conversations/${conversation.id}`);
		expect(response.status).toBe(401);
	});

	it('should return 404 if the conversation does not exist', async () => {
		await userService.create(mockUser);
		const { access_token } = await authService.validateAndLogin(CREDENTIALS)

		const response = await request(app.getHttpServer())
			.get(`/conversations/${new mongoose.Types.ObjectId()}`)
			.set('Authorization', `Bearer ${access_token}`);

		expect(response.status).toBe(404);
	});

	it('GET /conversations/me should list only my active conversations with the last message', async () => {
		const user = await userService.create(mockUser);
		const maria = await userService.create(mockUserMaria);
		const { access_token } = await authService.validateAndLogin(CREDENTIALS)

		const myConversation = await conversationService.create({ participants: [user.id, maria.id] });
		await conversationService.create({ participants: [user.id, new mongoose.Types.ObjectId()], isActive: false });
		await conversationService.create({ participants: [new mongoose.Types.ObjectId(), maria.id] });

		await messagesService.create({ sender: maria.id, conversationId: myConversation.id, content: 'Oi!', sentAt: new Date('2025-01-01') });
		await messagesService.create({ sender: user.id, conversationId: myConversation.id, content: 'Olá Maria', sentAt: new Date('2025-01-02') });

		const response = await request(app.getHttpServer())
			.get('/conversations/me')
			.set('Authorization', `Bearer ${access_token}`);

		expect(response.status).toBe(200);
		expect(response.body.length).toBe(1);
		expect(response.body[0]._id).toBe(myConversation.id);
		expect(response.body[0].lastMessage.content).toBe('Olá Maria');
	});

	it('GET /conversations/:id/messages should paginate messages', async () => {
		const user = await userService.create(mockUser);
		const maria = await userService.create(mockUserMaria);
		const { access_token } = await authService.validateAndLogin(CREDENTIALS)

		const conversation = await conversationService.create({ participants: [user.id, maria.id] });

		for (let i = 1; i <= 3; i++) {
			await messagesService.create({
				sender: user.id,
				conversationId: conversation.id,
				content: `Mensagem ${i}`,
				sentAt: new Date(`2025-01-0${i}`),
			});
		}

		const response = await request(app.getHttpServer())
			.get(`/conversations/${conversation.id}/messages?limit=2&skip=0`)
			.set('Authorization', `Bearer ${access_token}`);

		expect(response.status).toBe(200);
		expect(response.body.map(m => m.content)).toEqual(['Mensagem 3', 'Mensagem 2']);
	});

	it('DELETE /conversations/:id should be admin only', async () => {
		const user = await userService.create(mockUser);
		const { access_token } = await authService.validateAndLogin(CREDENTIALS)

		const conversation = await conversationService.create({
			participants: [user.id, new mongoose.Types.ObjectId()],
		});

		const response = await request(app.getHttpServer())
			.delete(`/conversations/${conversation.id}`)
			.set('Authorization', `Bearer ${access_token}`);

		expect(response.status).toBe(401);
		expect(await conversationModel.findById(conversation.id)).not.toBeNull();
	});
});
