import mongoose, { model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ConversationService } from '../conversation.service';
import { Conversation } from '../schemas/conversation.schema';
import { Model, Types } from 'mongoose';
import { MessagesService } from '../../messages/messages.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { conversationMock } from './mock/conversation.mock';
import { SetupTestApp } from '../../../test/test-setup';

let app: INestApplication;
let conversationService: ConversationService;
let conversationModel: Model<Conversation>;
let mongoServer: MongoMemoryServer;
let messagesService: MessagesService;

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	conversationService = moduleFixture.get(ConversationService);
	messagesService = moduleFixture.get(MessagesService);
	conversationModel = moduleFixture.get<Model<Conversation>>(getModelToken(Conversation.name));
});

beforeEach(async () => {
	await conversationModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

describe('💬 ConversationService', () => {
	it('should be defined', () => {
		expect(conversationService).toBeDefined();
	});

	describe('🆕 create', () => {
		it('should create a new conversation with 2 participants', async () => {
			const mockDto: CreateConversationDto = conversationMock;

			const conversation = await conversationService.create(mockDto);
			expect(conversation).toBeDefined();
			expect(conversation.participants.length).toBe(2);
		});

		it('should throw if participants are not exactly 2', async () => {
			const dto: CreateConversationDto = {
				participants: [new Types.ObjectId()],
				messages: [],
			};

			await expect(conversationService.create(dto)).rejects.toThrow(Error);
		});
	});

	describe('🔍 findById', () => {
		it('should find a conversation by id', async () => {
			const dto: CreateConversationDto = conversationMock;
			const conversation = await conversationService.create(dto);

			const found = await conversationService.findById(conversation.id);
			expect(found).toBeDefined();
			expect(found.id).toBe(conversation.id);
		});

		it('should throw NotFoundException if not found', async () => {
			const fakeId = new mongoose.Types.ObjectId();
			await expect(conversationService.findById(fakeId)).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe('🔎 findBetweenUsers', () => {
		it('should find conversation between two users', async () => {
			const user1 = conversationMock.participants[0];
			const user2 = conversationMock.participants[1];

			const dto: CreateConversationDto = {
				participants: [user1, user2],
				messages: [],
				isActive: true,
			};

			await conversationService.create(dto);

			const found = await conversationService.findBetweenUsers(user1, user2);

			expect(found).toBeDefined();

			expect(found?.participants).toEqual(expect.arrayContaining([user1, user2]));
		});

		it('should return null if no conversation exists between the users', async () => {
			const user1 = new mongoose.Types.ObjectId();
			const user2 = new mongoose.Types.ObjectId();

			const found = await conversationService.findBetweenUsers(user1, user2);
			expect(found).toBeNull();
		});

		it('should not return conversation if isActive is false', async () => {
			const user1 = new mongoose.Types.ObjectId();
			const user2 = new mongoose.Types.ObjectId();

			const dto: CreateConversationDto = {
				participants: [user1, user2],
				messages: [],
				isActive: false,
			};

			await conversationService.create(dto);

			const found = await conversationService.findBetweenUsers(user1, user2);
			expect(found).toBeNull();
		});
	});

	describe('🧾 getMessages', () => {
		it('should get messages from a conversation', async () => {
			const participant1 = new Types.ObjectId();
			const participant2 = new Types.ObjectId();

			const participants = [participant1, participant2];

			// Cria a conversa sem mensagens inicialmente
			const dto: CreateConversationDto = {
				participants,
			};

			const conversation = await conversationService.create(dto);

			// Cria mensagens associadas a essa conversa
			const message1 = {
				sender: participant1,
				conversationId: conversation.id,
				content: 'Hey!',
				sentAt: new Date(),
			};

			const message2 = {
				sender: participant2,
				conversationId: conversation.id,
				content: 'Hello!',
				sentAt: new Date(),
			};

			await messagesService.create(message1);
			await messagesService.create(message2);

			// Agora sim, pega as mensagens pela função
			const result = await conversationService.getMessages(conversation.id);

			expect(result.length).toBe(2);
			// Como o getMessages ordena por sentAt DESC e não faz reverse,
			// a mensagem mais recente vem primeiro
			expect(result[0].content).toBe('Hey!');
			expect(result[1].content).toBe('Hello!');
		});

		it('should throw if conversation not found', async () => {
			const fakeId = new Types.ObjectId();
			await expect(conversationService.getMessages(fakeId)).rejects.toThrow(
				NotFoundException,
			);
		});
	});
});
