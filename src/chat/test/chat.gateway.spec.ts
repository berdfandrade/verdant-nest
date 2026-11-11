import { Test, TestingModule } from '@nestjs/testing';
import mongoose, { Model } from 'mongoose';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ChatModule } from '@/chat/chat.module';
import { ChatGateway, conversationRoom, userRoom } from '@/chat/chat.gateway';
import { ChatService } from '@/chat/chat.service';
import { UserService } from '@/user/user.service';
import { User } from '@/user/user.schema';
import { ConversationService } from '@/conversation/conversation.service';
import { Conversation } from '@/conversation/schemas/conversation.schema';
import { AuthService } from '@/auth/auth.service';
import { RedisService } from '@/redis/redis.service';
import { mockUser, mockUserMaria } from '@/user/test/mock/user.mock';
import { AuthDto } from '@/auth/dto/auth.dto';

let mongoServer: MongoMemoryServer;
let gateway: ChatGateway;
let chatService: ChatService;
let userService: UserService;
let authService: AuthService;
let conversationService: ConversationService;
let redisService: RedisService;
let userModel: Model<User>;
let conversationModel: Model<Conversation>;

const CREDENTIALS: AuthDto = {
	email: 'bernardo@example.com',
	password: 'securePass123',
};

// Socket "fake" com o mínimo que o gateway usa
const createFakeSocket = (token?: string) =>
	({
		id: `fake-socket-${new mongoose.Types.ObjectId()}`,
		data: {} as Record<string, any>,
		handshake: { auth: { token }, headers: {} },
		emit: jest.fn(),
		join: jest.fn(),
		leave: jest.fn(),
		disconnect: jest.fn(),
	}) as any;

// Server "fake": guarda para qual sala cada evento foi emitido
const createFakeServer = () => {
	const emitted: { room: string; event: string; data: any }[] = [];
	return {
		emitted,
		to: jest.fn((room: string) => ({
			emit: (event: string, data: any) => emitted.push({ room, event, data }),
		})),
	} as any;
};

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();

	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [MongooseModule.forRoot(mongoServer.getUri()), ChatModule],
	}).compile();

	gateway = moduleFixture.get(ChatGateway);
	chatService = moduleFixture.get(ChatService);
	userService = moduleFixture.get(UserService);
	authService = moduleFixture.get(AuthService);
	conversationService = moduleFixture.get(ConversationService);
	redisService = moduleFixture.get(RedisService);
	userModel = moduleFixture.get(getModelToken(User.name));
	conversationModel = moduleFixture.get(getModelToken(Conversation.name));
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await conversationModel.deleteMany({});
	gateway.server = createFakeServer();
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await redisService.onModuleDestroy();
});

// Conecta o Bernardo no gateway e cria uma conversa com a Maria
const connectBernardo = async () => {
	const user = await userService.create(mockUser);
	const maria = await userService.create(mockUserMaria);
	const conversation = await conversationService.create({ participants: [user.id, maria.id] });
	const { access_token } = await authService.validateAndLogin(CREDENTIALS);

	const client = createFakeSocket(access_token);
	await gateway.handleConnection(client);

	return { user, maria, conversation, client };
};

describe('🦜 ChatGateway', () => {
	describe('🔌 connection', () => {
		it('should disconnect a socket without token', async () => {
			const client = createFakeSocket();
			await gateway.handleConnection(client);

			expect(client.emit).toHaveBeenCalledWith('auth_error', expect.any(String));
			expect(client.disconnect).toHaveBeenCalled();
		});

		it('should disconnect a socket with an invalid token', async () => {
			const client = createFakeSocket('invalid.token.here');
			await gateway.handleConnection(client);

			expect(client.disconnect).toHaveBeenCalled();
		});

		it('should take the userId from the token and mark the user online', async () => {
			const { user, client } = await connectBernardo();

			expect(client.disconnect).not.toHaveBeenCalled();
			expect(client.data.userId).toBe(user.id);
			expect(client.join).toHaveBeenCalledWith(userRoom(user.id));
			expect(await chatService.isOnline(user.id)).toBe(true);

			await gateway.handleDisconnect(client);
			expect(await chatService.isOnline(user.id)).toBe(false);
		});
	});

	describe('🚪 join_conversation', () => {
		it('should join the room of a conversation I am in', async () => {
			const { conversation, client } = await connectBernardo();

			await gateway.handleJoinConversation({ conversationId: conversation.id }, client);

			expect(client.join).toHaveBeenCalledWith(conversationRoom(conversation.id));
			expect(client.emit).toHaveBeenCalledWith('joined_conversation', { conversationId: conversation.id });

			await gateway.handleLeaveConversation({ conversationId: conversation.id }, client);
			await gateway.handleDisconnect(client);
		});

		it('should not join a conversation I am not in', async () => {
			const { client } = await connectBernardo();
			const otherConversation = await conversationService.create({
				participants: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
			});

			await gateway.handleJoinConversation({ conversationId: otherConversation.id }, client);

			expect(client.join).not.toHaveBeenCalledWith(conversationRoom(otherConversation.id));
			expect(client.emit).toHaveBeenCalledWith('join_conversation_error', { message: 'User not allowed' });

			await gateway.handleDisconnect(client);
		});
	});

	describe('✉️ send_message', () => {
		it('should save the message and deliver it to the room and to the other participant', async () => {
			const { user, maria, conversation, client } = await connectBernardo();

			await gateway.handleSendMessage({ conversationId: conversation.id, content: 'Oi Maria!' }, client);

			const history = await conversationService.getMessages(conversation.id);
			expect(history.length).toBe(1);
			expect(history[0].sender.toString()).toBe(user.id);

			const emitted = gateway.server['emitted'];
			expect(emitted).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ room: conversationRoom(conversation.id), event: 'new_message' }),
					expect.objectContaining({ room: userRoom(maria.id), event: 'notification' }),
				]),
			);
			// Não notifica o próprio remetente
			expect(emitted.some(e => e.room === userRoom(user.id))).toBe(false);

			await gateway.handleDisconnect(client);
		});

		it('should reject empty messages', async () => {
			const { conversation, client } = await connectBernardo();

			await gateway.handleSendMessage({ conversationId: conversation.id, content: '   ' }, client);

			expect(client.emit).toHaveBeenCalledWith('send_message_error', expect.anything());
			expect((await conversationService.getMessages(conversation.id)).length).toBe(0);

			await gateway.handleDisconnect(client);
		});

		it('should reject an invalid conversation id', async () => {
			const { client } = await connectBernardo();

			await gateway.handleSendMessage({ conversationId: 'abc', content: 'Oi' }, client);

			expect(client.emit).toHaveBeenCalledWith('send_message_error', { message: 'Invalid ConversationId' });

			await gateway.handleDisconnect(client);
		});
	});

	describe('📜 view_messages', () => {
		it('should return the history only to participants', async () => {
			const { user, conversation, client } = await connectBernardo();
			await chatService.sendMessage({ sender: user.id, conversationId: conversation.id, content: 'Primeira' });

			await gateway.handleViewMessages({ conversationId: conversation.id }, client);
			expect(client.emit).toHaveBeenCalledWith(
				'view_messages',
				expect.objectContaining({ messageHistory: expect.any(Array) }),
			);

			const otherConversation = await conversationService.create({
				participants: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
			});
			await gateway.handleViewMessages({ conversationId: otherConversation.id }, client);
			expect(client.emit).toHaveBeenCalledWith('view_messages_error', expect.anything());

			await gateway.handleDisconnect(client);
		});
	});
});
