import mongoose from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { MessagesService } from '@/messages/messages.service';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SendMessageDto } from '@/messages/dto/send-message.dto';
import { ForbiddenException, INestApplication, NotFoundException } from '@nestjs/common';
import { SetupTestApp } from '@test/test-setup';
import { Conversation } from '@/conversation/schemas/conversation.schema';
import { Message } from '@/messages/message.schema';
import { ConversationService } from '@/conversation/conversation.service';
import { UserService } from '@/user/user.service';
import { User } from '@/user/user.schema';
import { mockUser, mockUserMaria } from '@/user/test/mock/user.mock';
import { CreateUserDto } from '@/user/dto/create-user.dto';
import { CreateConversationDto } from '@/conversation/dto/create-conversation.dto';

let app: INestApplication;
let mongoServer: MongoMemoryServer;

let messagesService: MessagesService;
let conversationService: ConversationService;
let userService: UserService;

let conversationModel: Model<Conversation>;
let messageModel: Model<Message>;
let userModel: Model<User>;

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	messagesService = moduleFixture.get(MessagesService);
	conversationService = moduleFixture.get(ConversationService);
	userService = moduleFixture.get(UserService);
	userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
	messageModel = moduleFixture.get<Model<Message>>(getModelToken(Message.name));
	conversationModel = moduleFixture.get<Model<Conversation>>(getModelToken(Conversation.name));
});

beforeEach(async () => {
	await messageModel.deleteMany({});
	await conversationModel.deleteMany({});
	await userModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

describe('📩 MessageService', () => {
	it('should be defined', () => {
		expect(conversationService).toBeDefined();
	});

	it('Should create a new message within a conversation', async () => {
		// Primeiro preciso criar um user
		const userDto: CreateUserDto = mockUser;
		const userDto2: CreateUserDto = mockUserMaria;

		const user1 = await userService.create(userDto);
		const user2 = await userService.create(userDto2);

		const mockConversation: CreateConversationDto = {
			participants: [user1.id, user2.id],
		};

		const conversation = await conversationService.create(mockConversation);

		const message1 = {
			sender: user1.id,
			conversationId: conversation.id,
			content: 'Olá, tudo bem',
			sentAt: new Date(),
		};

		const message2 = {
			sender: user2.id,
			conversationId: conversation.id,
			content: 'Tudo e você?',
			sentAt: new Date(),
		};

		const sentMessage1 = await messagesService.create(message1);
		const sentMessage2 = await messagesService.create(message2);

		const conversationAfterMessage = await conversationService.findById(conversation.id);
		expect(conversationAfterMessage.messages.length).toBe(2);

		// Verifica se os IDs das mensagens estão corretamente associados
		const messageIds = conversationAfterMessage.messages.map((msg: any) =>
			msg._id.toString(),
		);

		expect(messageIds).toContain(sentMessage1.id);
		expect(messageIds).toContain(sentMessage2.id);
	});

	it('Should modify a message', async () => {
		const userDto: CreateUserDto = mockUser;
		const userDto2: CreateUserDto = mockUserMaria;

		const user1 = await userService.create(userDto);
		const user2 = await userService.create(userDto2);

		const mockConversation: CreateConversationDto = {
			participants: [user1.id, user2.id],
		};

		const conversation = await conversationService.create(mockConversation);

		const message1 = {
			sender: user1.id,
			conversationId: conversation.id,
			content: 'Olá, tudo bem',
			sentAt: new Date(),
		};

		const sentMessage1 = await messagesService.create(message1);

		const modifiedMessage = {
			messageId: sentMessage1.id,
			sender: user1.id,
			conversationId: conversation.id,
			content: 'Mensagem modificada',
		};

		const modifyMessage = await messagesService.modifyMessage(modifiedMessage);

		expect(modifyMessage.content).toBe(modifiedMessage.content);
	});

	it('Should find a message', async () => {
		const userDto: CreateUserDto = mockUser;
		const userDto2: CreateUserDto = mockUserMaria;

		const user1 = await userService.create(userDto);
		const user2 = await userService.create(userDto2);

		const mockConversation: CreateConversationDto = {
			participants: [user1.id, user2.id],
		};

		const conversation = await conversationService.create(mockConversation);

		const message1 = {
			sender: user1.id,
			conversationId: conversation.id,
			content: 'Olá, tudo bem',
			sentAt: new Date(),
		};

		const message2 = {
			sender: user2.id,
			conversationId: conversation.id,
			content: 'Tudo e você?',
			sentAt: new Date(),
		};

		await messagesService.create(message1);
		await messagesService.create(message2);

		const searchMessage = await messagesService.searchMessage('Olá');

		expect(searchMessage[0].content).toBe(message1.content);
		expect(searchMessage[0].sender.toString()).toBe(message1.sender);
	});

	it('Should not let a non participant send a message', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		const conversation = await conversationService.create({ participants: [user1.id, user2.id] });

		await expect(
			messagesService.create({
				sender: new Types.ObjectId(),
				conversationId: conversation.id,
				content: 'Intruso',
				sentAt: new Date(),
			}),
		).rejects.toThrow(ForbiddenException);
	});

	it('Should not send messages to an inactive conversation', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		const conversation = await conversationService.create({
			participants: [user1.id, user2.id],
			isActive: false,
		});

		await expect(
			messagesService.create({
				sender: user1.id,
				conversationId: conversation.id,
				content: 'Oi?',
				sentAt: new Date(),
			}),
		).rejects.toThrow(ForbiddenException);
	});

	it('Should not modify a message from another sender', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		const conversation = await conversationService.create({ participants: [user1.id, user2.id] });
		const message = await messagesService.create({
			sender: user1.id,
			conversationId: conversation.id,
			content: 'Original',
			sentAt: new Date(),
		});

		await expect(
			messagesService.modifyMessage({
				messageId: message.id,
				sender: user2.id,
				content: 'Editada pela outra pessoa',
			}),
		).rejects.toThrow(NotFoundException);
	});

	it('Should set editedAt when a message is modified', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		const conversation = await conversationService.create({ participants: [user1.id, user2.id] });
		const message = await messagesService.create({
			sender: user1.id,
			conversationId: conversation.id,
			content: 'Original',
			sentAt: new Date(),
		});

		const modified = await messagesService.modifyMessage({
			messageId: message.id,
			sender: user1.id,
			content: 'Editada',
		});

		expect(modified.editedAt).toBeInstanceOf(Date);
	});

	it('Should delete a message and remove it from the conversation', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		const conversation = await conversationService.create({ participants: [user1.id, user2.id] });
		const message = await messagesService.create({
			sender: user1.id,
			conversationId: conversation.id,
			content: 'Vou apagar',
			sentAt: new Date(),
		});

		const response = await messagesService.deleteMessage(message.id, user1.id);
		expect(response.deleted).toBe(true);

		expect(await messageModel.findById(message.id)).toBeNull();
		const updatedConversation = await conversationModel.findById(conversation.id);
		expect(updatedConversation?.messages.length).toBe(0);
	});

	it('Should search only inside the given conversation', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		const conversationA = await conversationService.create({ participants: [user1.id, user2.id] });
		const conversationB = await conversationService.create({ participants: [user1.id, user2.id] });

		await messagesService.create({ sender: user1.id, conversationId: conversationA.id, content: 'Bom dia', sentAt: new Date() });
		await messagesService.create({ sender: user1.id, conversationId: conversationB.id, content: 'Bom dia também', sentAt: new Date() });

		const result = await messagesService.searchMessage('bom dia', conversationA.id);

		expect(result.length).toBe(1);
		expect(result[0].conversationId.toString()).toBe(conversationA.id);
	});

	it('Should treat the search text literally (no regex injection)', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		const conversation = await conversationService.create({ participants: [user1.id, user2.id] });
		await messagesService.create({ sender: user1.id, conversationId: conversation.id, content: 'Qualquer coisa', sentAt: new Date() });

		const result = await messagesService.searchMessage('.*');
		expect(result.length).toBe(0);
	});
});
