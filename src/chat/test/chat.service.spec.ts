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
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { mockUser, mockUserMaria } from '../../user/test/mock/user.mock';
import { RedisService } from '../../redis/redis.service';

let mongoServer: MongoMemoryServer;
let chatService: ChatService;
let userService: UserService;
let conversationService: ConversationService;
let redisService: RedisService;
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
	conversationModel = moduleFixture.get<Model<Conversation>>(getModelToken(Conversation.name));
	conversationService = moduleFixture.get<ConversationService>(ConversationService);
	chatService = moduleFixture.get<ChatService>(ChatService);
	conversationService = moduleFixture.get<ConversationService>(ConversationService);
	redisService = moduleFixture.get<RedisService>(RedisService);
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await conversationModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await redisService.onModuleDestroy()
});

describe('🦜 ChatService', () => {
	it('Should be defined', () => {
		expect(chatService).toBeDefined();
	});

	it('should create and remove a connection in Redis', async () => {
		const user1 = await userService.create(mockUser as CreateUserDto);
		const user2 = await userService.create(mockUserMaria as CreateUserDto);

		const conversation = await conversationService.create({
			participants: [user1.id, user2.id],
		});

		const mockSocketId = '1237845121';

		const connection: ChatConnection = {
			userId: user1.id,
			conversationId: conversation.id,
			socketId: mockSocketId,
		};

		await chatService.addConnection(connection);

		const redisValue = await redisService.getKey(`connection:${mockSocketId}`);
		expect(redisValue).toBeDefined();

		const parsed = JSON.parse(redisValue!);
		expect(parsed).toMatchObject(connection);

		await chatService.removeConnection({
			socketId: mockSocketId,
			conversationId: conversation.id,
		});

		const after = await redisService.getKey(`connection:${mockSocketId}`);
		expect(after).toBeNull();

		const isMember = await redisService.isMemberOfSet(`conversation:${conversation.id}`, mockSocketId);
		expect(isMember).toBe(false);
	});

	describe('🟢 presence', () => {
		it('should set a user online and offline by the socket id', async () => {
			const userId = new mongoose.Types.ObjectId().toString();
			const socketId = `test-socket-${Date.now()}`;

			await chatService.setOnline(userId, socketId);
			expect(await chatService.isOnline(userId)).toBe(true);

			const removedUser = await chatService.setOffline(socketId);
			expect(removedUser).toBe(userId);
			expect(await chatService.isOnline(userId)).toBe(false);
		});

		it('should keep the user online if an old socket disconnects', async () => {
			const userId = new mongoose.Types.ObjectId().toString();
			const oldSocket = `old-socket-${Date.now()}`;
			const newSocket = `new-socket-${Date.now()}`;

			await chatService.setOnline(userId, oldSocket);
			await chatService.setOnline(userId, newSocket); // reconectou

			await chatService.setOffline(oldSocket);
			expect(await chatService.isOnline(userId)).toBe(true);

			await chatService.setOffline(newSocket);
			expect(await chatService.isOnline(userId)).toBe(false);
		});
	});

	describe('🔐 userIsAllowed', () => {
		it('should allow only participants of an active conversation', async () => {
			const user1 = await userService.create(mockUser as CreateUserDto);
			const user2 = await userService.create(mockUserMaria as CreateUserDto);

			const conversation = await conversationService.create({ participants: [user1.id, user2.id] });
			const inactive = await conversationService.create({ participants: [user1.id, user2.id], isActive: false });

			expect(await chatService.userIsAllowed(user1.id, conversation.id)).toBe(true);
			expect(await chatService.userIsAllowed(new mongoose.Types.ObjectId(), conversation.id)).toBe(false);
			expect(await chatService.userIsAllowed(user1.id, inactive.id)).toBe(false);
			expect(await chatService.userIsAllowed(user1.id, new mongoose.Types.ObjectId())).toBe(false);
		});
	});

	describe('✉️ sendMessage', () => {
		it('should persist the message and return it', async () => {
			const user1 = await userService.create(mockUser as CreateUserDto);
			const user2 = await userService.create(mockUserMaria as CreateUserDto);
			const conversation = await conversationService.create({ participants: [user1.id, user2.id] });

			const result = await chatService.sendMessage({
				sender: user1.id,
				conversationId: conversation.id,
				content: 'Oi pelo socket',
			});

			expect(result.delivered).toBe(true);
			expect(result.message?.content).toBe('Oi pelo socket');

			const history = await conversationService.getMessages(conversation.id);
			expect(history.length).toBe(1);
		});
	});
});
