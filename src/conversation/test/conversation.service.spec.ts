import mongoose from 'mongoose';
import MongoDbUtils from '../../utils/MongoDB.utils';
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConversationService } from '../conversation.service';
import { Conversation, ConversationSchema } from '../schemas/conversation.schema';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { NotFoundException } from '@nestjs/common';
import { conversationMock } from './mock/conversation.mock';


let mongoServer: MongoMemoryServer;
let conversationService: ConversationService;
let conversationModel: Model<Conversation>;

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = mongoServer.getUri();

	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [
			MongooseModule.forRoot(mongoUri),
			MongooseModule.forFeature([
				{ name: Conversation.name, schema: ConversationSchema },
			]),
		],
		providers: [ConversationService],
	}).compile();

	conversationService = moduleFixture.get<ConversationService>(ConversationService);
	conversationModel = moduleFixture.get<Model<Conversation>>(
		getModelToken(Conversation.name),
	);
});

beforeEach(async () => {
	await conversationModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
});

describe('💬 ConversationService', () => {
	it('should be defined', () => {
		expect(conversationService).toBeDefined();
	});

	describe('🆕 create', () => {
		it('should create a new conversation with 2 participants', async () => {

			const mockDto : CreateConversationDto = conversationMock

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

			const dto: CreateConversationDto = conversationMock
			await conversationService.create(dto);
		
			const found = await conversationService.findById(conversationMock._id);
			console.log(found)

			expect(found).toBeDefined();

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
			expect(found?.id).toEqual(conversationMock._id);
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

	describe('📩 addMessage', () => {
		it('should add a message to conversation', async () => {
			const participant1 = new Types.ObjectId();
			const participant2 = new Types.ObjectId();

			const dto: CreateConversationDto = {
				participants: [participant1, participant2],
				messages: [],
			};

			const conversation = await conversationService.create(dto);

			const message = {
				sender: dto.participants[0],
				content: 'Hello!',
				sentAt: new Date(),
			};
            
			const updated = await conversationService.addMessage(
				MongoDbUtils.toObjectId(conversation.id),
				message as any,
			);
			expect(updated.messages.length).toBe(1);
			expect(updated.messages[0].content).toBe('Hello!');
		});

		it('should throw if conversation not found', async () => {
			const fakeId = new Types.ObjectId();
			const message = {
				sender: new Types.ObjectId(),
				content: 'Hi',
				sentAt: new Date(),
			};

			await expect(
				conversationService.addMessage(fakeId, message as any),
			).rejects.toThrow(NotFoundException);
		});
	});

	describe('🧾 getMessages', () => {
		it('should get messages from a conversation', async () => {

            const participant1 = new Types.ObjectId();
			const participant2 = new Types.ObjectId();

			const participants = [participant1, participant2]
			const messages = [
				{
					sender: participant1,
					content: 'Hey!',
					sentAt: new Date(),
				},
				{
					sender: participant2,
					content: 'Hello!',
					sentAt: new Date(),
				},
			];

			const dto: CreateConversationDto = {
				participants,
				messages,
			};

			const conversation = await conversationService.create(dto);
			const result = await conversationService.getMessages(new Types.ObjectId(conversation.id));

			expect(result.length).toBe(2);
			expect(result[0].content).toBe('Hey!');
		});

		it('should throw if conversation not found', async () => {
			const fakeId = new Types.ObjectId();
			await expect(conversationService.getMessages(fakeId)).rejects.toThrow(
				NotFoundException,
			);
		});
	});
});
