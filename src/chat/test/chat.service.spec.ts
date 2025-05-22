import { Test, TestingModule } from '@nestjs/testing';
import mongoose from 'mongoose';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { UserModule } from '../../user/user.module';
import { ChatConnection, ChatService } from '../chat.service';
import { ConversationService } from '../../conversation/conversation.service';
import { UserService } from '../../user/user.service';
import { User, UserSchema } from '../../user/user.schema';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation } from '../../conversation/schemas/conversation.schema';
import { ConversationModule } from '../../conversation/conversation.module';
import { ChatModule } from '../chat.module';
import { CreateConversationDto } from '../../conversation/dto/create-conversation.dto';
import { RemoveChatConnection } from '../chat.service';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { mockUser, mockUserMaria } from '../../user/test/mock/user.mock';

let mongoServer: MongoMemoryServer;
let chatService: ChatService;
let userService: UserService;
let conversationService: ConversationService;
let conversationModel: Model<Conversation>;
let userModel: Model<User>;

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = mongoServer.getUri();

	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [
			MongooseModule.forRoot(mongoUri),
			MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
			UserModule,
			ConversationModule,
			ChatModule,
		],
	}).compile();

	userService = moduleFixture.get<UserService>(UserService);
	userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
	conversationModel = moduleFixture.get<Model<Conversation>>(
		getModelToken(Conversation.name),
	);
	conversationService = moduleFixture.get<ConversationService>(ConversationService);
	chatService = moduleFixture.get<ChatService>(ChatService);
	conversationService = moduleFixture.get<ConversationService>(ConversationService);
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await conversationModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await chatService['redis'].quit();
});

describe('ChatService', () => {
	it('Should be defined', () => {
		expect(chatService).toBeDefined();
	});

	it('Should a connection create a connection in Redis', async () => {
		// Primeiro crio os dois users
		const userDto: CreateUserDto = mockUser;
		const userDto2: CreateUserDto = mockUserMaria;

		const user1 = await userService.create(userDto);
		const user2 = await userService.create(userDto2);

		// Conversa DTO
		const createConversation: CreateConversationDto = {
			participants: [user1.id, user2.id],
		};

		// Depois crio a conversa entre eles no DB
		const conversation = await conversationService.create(createConversation);

		const mockChatSocket = '1237845121';

		// Conexão mockada
		const connection: ChatConnection = {
			userId: user1.id,
			conversationId: conversation.id,
			socketId: mockChatSocket,
		};

		const connectionToBeRemoved: RemoveChatConnection = {
			socketId: mockChatSocket,
			conversationId: conversation.id,
		};

		// Adiciona a conexão no redis
		await chatService.addConnection(connection);

		const redisValue = await chatService['redis'].get(`connection:${mockChatSocket}`);
		if (!redisValue) return 'Could not retrive redis value';

		const parsed = JSON.parse(redisValue);
		expect(parsed.socketId).toBe(connection.socketId);
		expect(parsed.userId).toBe(connection.userId);
		expect(parsed.conversationId).toBe(connection.conversationId);

		// Remove e verifica a remoção
		await chatService.removeConnection(connectionToBeRemoved);
		const redisAfterDelete = await chatService['redis'].get(
			`connection:${mockChatSocket}`,
		);
		expect(redisAfterDelete).toBeNull();

		const isMember = await chatService['redis'].sismember(
			`conversation:${conversation.id}`,
			mockChatSocket,
		);
		expect(isMember).toBe(0); // 0 = não é mais membro
	});

	it('Should remove a Redis connection', async () => {
		// Primeiro crio os dois users
		const userDto: CreateUserDto = mockUser;
		const userDto2: CreateUserDto = mockUserMaria;

		const user1 = await userService.create(userDto);
		const user2 = await userService.create(userDto2);

		// Conversa DTO
		const createConversation: CreateConversationDto = {
			participants: [user1.id, user2.id],
		};

		// Depois crio a conversa entre eles no DB
		const conversation = await conversationService.create(createConversation);

		const mockChatSocket = '1237845121';

		// Conexão mockada
		const connection: ChatConnection = {
			userId: user1.id,
			conversationId: conversation.id,
			socketId: mockChatSocket,
		};

		const connectionToBeRemoved: RemoveChatConnection = {
			socketId: mockChatSocket,
			conversationId: conversation.id,
		};

		// Adiciona a conexão no redis
		await chatService.addConnection(connection);

		// Remove a conexão do redis
		await chatService.removeConnection(connectionToBeRemoved);
		const redisAfterDelete = await chatService['redis'].get(
			`connection:${mockChatSocket}`,
		);
		expect(redisAfterDelete).toBeNull();

		const isMember = await chatService['redis'].sismember(
			`conversation:${conversation.id}`,
			mockChatSocket,
		);
		expect(isMember).toBe(0);
	});
});
