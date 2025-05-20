import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import mongoose from 'mongoose';
import { mockUser } from '../../user/test/mock/user.mock';
import { Model } from 'mongoose';
import { User, UserSchema } from '../../user/user.schema';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from '../schemas/conversation.schema';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { UserService } from '../../user/user.service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConversationService } from '../conversation.service';
import { AuthModule } from '../../auth/auth.module';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { ConversationController } from '../conversation.controller';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let jwtService: JwtService;
let conversationService: ConversationService;
let conversationController: ConversationController;
let userService: UserService;
let conversationModel: Model<Conversation>;
let userModel: Model<User>;

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = mongoServer.getUri();

	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [
			MongooseModule.forRoot(mongoUri),
			MongooseModule.forFeature([
				{ name: User.name, schema: UserSchema },
				{ name: Conversation.name, schema: ConversationSchema },
			]),
			AppModule,
			AuthModule,
		],
	}).compile();

	app = moduleFixture.createNestApplication();
	app.useGlobalPipes(new ValidationPipe());
	await app.init();

	jwtService = moduleFixture.get<JwtService>(JwtService);
	userService = moduleFixture.get<UserService>(UserService);
	conversationService = moduleFixture.get<ConversationService>(ConversationService);
	conversationModel = moduleFixture.get(getModelToken(Conversation.name));
	userModel = moduleFixture.get(getModelToken(User.name));
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await conversationModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	if (app) {
		await app.close();
	}
});

describe('ConversationController (e2e)', () => {
	it('should return 200 if the user is in the conversation', async () => {
		const dto: CreateUserDto = mockUser;
		const user = await userService.create(dto);

		const token = jwtService.sign({ sub: user.id });
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
