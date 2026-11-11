import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import mongoose, { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SetupTestApp } from '../../../test/test-setup';
import { User } from '../../user/user.schema';
import { UserService } from '../../user/user.service';
import { AuthService } from '../../auth/auth.service';
import { AuthDto } from '../../auth/dto/auth.dto';
import { mockUser, mockUserMaria } from '../../user/test/mock/user.mock';
import { ConversationService } from '../../conversation/conversation.service';
import { Conversation } from '../../conversation/schemas/conversation.schema';
import { Message } from '../message.schema';
import { MessagesService } from '../messages.service';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let userService: UserService;
let authService: AuthService;
let conversationService: ConversationService;
let messagesService: MessagesService;
let userModel: Model<User>;
let conversationModel: Model<Conversation>;
let messageModel: Model<Message>;

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
	conversationService = moduleFixture.get(ConversationService);
	messagesService = moduleFixture.get(MessagesService);
	userModel = moduleFixture.get(getModelToken(User.name));
	conversationModel = moduleFixture.get(getModelToken(Conversation.name));
	messageModel = moduleFixture.get(getModelToken(Message.name));
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await conversationModel.deleteMany({});
	await messageModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

// Cria Bernardo + Maria com uma conversa entre eles e retorna o token do Bernardo
const setupConversation = async () => {
	const user = await userService.create(mockUser);
	const maria = await userService.create(mockUserMaria);
	const conversation = await conversationService.create({ participants: [user.id, maria.id] });
	const { access_token } = await authService.validateAndLogin(CREDENTIALS);
	return { user, maria, conversation, token: access_token };
};

describe('📩 MessagesController (e2e)', () => {
	it('should return 401 without token', async () => {
		const response = await request(app.getHttpServer()).post('/messages').send({});
		expect(response.status).toBe(401);
	});

	it('POST /messages should send a message as the logged user', async () => {
		const { user, maria, conversation, token } = await setupConversation();

		const response = await request(app.getHttpServer())
			.post('/messages')
			.set('Authorization', `Bearer ${token}`)
			// sender no body é ignorado: o remetente é sempre quem está logado
			.send({ conversationId: conversation.id, content: 'Oi Maria!', sender: maria.id });

		expect(response.status).toBe(201);
		expect(response.body.content).toBe('Oi Maria!');
		expect(response.body.sender).toBe(user.id);
	});

	it('POST /messages should return 400 for empty content', async () => {
		const { conversation, token } = await setupConversation();

		const response = await request(app.getHttpServer())
			.post('/messages')
			.set('Authorization', `Bearer ${token}`)
			.send({ conversationId: conversation.id, content: '' });

		expect(response.status).toBe(400);
	});

	it('POST /messages should return 403 for a conversation I am not in', async () => {
		const { token } = await setupConversation();
		const otherConversation = await conversationService.create({
			participants: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
		});

		const response = await request(app.getHttpServer())
			.post('/messages')
			.set('Authorization', `Bearer ${token}`)
			.send({ conversationId: otherConversation.id, content: 'Oi?' });

		expect(response.status).toBe(403);
	});

	it('PATCH /messages/:id should edit my message', async () => {
		const { user, conversation, token } = await setupConversation();
		const message = await messagesService.create({
			sender: user.id,
			conversationId: conversation.id,
			content: 'Original',
		});

		const response = await request(app.getHttpServer())
			.patch(`/messages/${message.id}`)
			.set('Authorization', `Bearer ${token}`)
			.send({ content: 'Editada' });

		expect(response.status).toBe(200);
		expect(response.body.content).toBe('Editada');
		expect(response.body.editedAt).toBeDefined();
	});

	it('PATCH /messages/:id should return 404 for a message from another user', async () => {
		const { maria, conversation, token } = await setupConversation();
		const message = await messagesService.create({
			sender: maria.id,
			conversationId: conversation.id,
			content: 'Mensagem da Maria',
		});

		const response = await request(app.getHttpServer())
			.patch(`/messages/${message.id}`)
			.set('Authorization', `Bearer ${token}`)
			.send({ content: 'Editada' });

		expect(response.status).toBe(404);
	});

	it('DELETE /messages/:id should delete my message', async () => {
		const { user, conversation, token } = await setupConversation();
		const message = await messagesService.create({
			sender: user.id,
			conversationId: conversation.id,
			content: 'Apagar',
		});

		const response = await request(app.getHttpServer())
			.delete(`/messages/${message.id}`)
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(await messageModel.findById(message.id)).toBeNull();
	});

	it('GET /messages/search should search inside my conversation', async () => {
		const { user, conversation, token } = await setupConversation();
		await messagesService.create({ sender: user.id, conversationId: conversation.id, content: 'Vamos ao cinema?' });
		await messagesService.create({ sender: user.id, conversationId: conversation.id, content: 'Bom dia' });

		const response = await request(app.getHttpServer())
			.get(`/messages/search?conversationId=${conversation.id}&q=cinema`)
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(200);
		expect(response.body.length).toBe(1);
		expect(response.body[0].content).toBe('Vamos ao cinema?');
	});

	it('GET /messages/search should return 403 for a conversation I am not in', async () => {
		const { token } = await setupConversation();
		const otherConversation = await conversationService.create({
			participants: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
		});

		const response = await request(app.getHttpServer())
			.get(`/messages/search?conversationId=${otherConversation.id}&q=oi`)
			.set('Authorization', `Bearer ${token}`);

		expect(response.status).toBe(403);
	});
});
