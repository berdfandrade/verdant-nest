import mongoose, { model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ConversationService } from '../conversation.service';
import { UserService } from '../../user/user.service';
import { Conversation } from '../schemas/conversation.schema';
import { Model, Types } from 'mongoose';
import { MessagesService } from '../../messages/messages.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { conversationMock } from './mock/conversation.mock';
import { SetupTestApp } from '../../../test/test-setup';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { mockUser, mockUserMaria } from '../../user/test/mock/user.mock';

let app: INestApplication;
let conversationService: ConversationService;
let conversationModel: Model<Conversation>;
let mongoServer: MongoMemoryServer;
let messagesService: MessagesService;
let userService: UserService;

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	conversationService = moduleFixture.get(ConversationService);
	messagesService = moduleFixture.get(MessagesService);
	userService = moduleFixture.get(UserService);
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
			const createUser1: CreateUserDto = mockUser;
			const createUser2: CreateUserDto = mockUserMaria;

			await userService.create(createUser1);
			await userService.create(createUser2);

			const user1 = await userService.findByEmail(createUser1.email);
			const user2 = await userService.findByEmail(createUser2.email);

			const conversationDto = {
				participants: [user1.id, user2.id],
				messages: [],
				startedAt: new Date('2025-05-01T09:58:00Z'),
				isActive: true,
				archivedAt: undefined,
			};

			await conversationService.create(conversationDto);

			// TODO #Bernardo : Gambiarra aqui
			const found = await conversationService.findBetweenUsers(user1.id, user2.id);
			const participantIds = found?.participants.map(
				(p: any) => p._id?.toString?.() || p.toString?.(),
			);
			expect(participantIds).toEqual(
				expect.arrayContaining([user1.id.toString(), user2.id.toString()]),
			);
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

			const dto: CreateConversationDto = { participants };
			const conversation = await conversationService.create(dto);

			// Define timestamps distintos
			const earlier = new Date('2025-06-25T14:00:00Z');
			const later = new Date('2025-06-25T15:00:00Z');

			const message1 = {
				sender: participant1,
				conversationId: conversation.id,
				content: 'Hey!', // mais antiga
				sentAt: earlier,
			};

			const message2 = {
				sender: participant2,
				conversationId: conversation.id,
				content: 'Hello!', // mais recente
				sentAt: later,
			};

			await messagesService.create(message1);
			await messagesService.create(message2);

			const result = await conversationService.getMessages(conversation.id);

			expect(result.length).toBe(2);
			expect(result.map(m => m.content)).toEqual(['Hello!', 'Hey!']); // DESC
		});

		it('should throw if conversation not found', async () => {
			const fakeId = new Types.ObjectId();
			await expect(conversationService.getMessages(fakeId)).rejects.toThrow(
				NotFoundException,
			);
		});
	});
});
