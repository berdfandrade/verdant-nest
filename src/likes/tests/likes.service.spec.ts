import mongoose from 'mongoose';
import { Model } from 'mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { LikesService } from '../likes.service';
import { UserModule } from '../../user/user.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../user/user.schema';
import { UserService } from '../../user/user.service';
import { LikesModule } from '../likes.module';
import { mockUser, mockUserMaria } from '../../user/test/mock/user.mock';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { LikeProfile } from '../likes.service';
import { AuthModule } from '../../auth/auth.module';
import { BadRequestException } from '@nestjs/common';
import { Conversation } from '../../conversation/schemas/conversation.schema';

let mongoServer: MongoMemoryServer;
let likesService: LikesService;
let userService: UserService;
let userModel: Model<User>;
let conversationModel: Model<Conversation>;

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = mongoServer.getUri();

	const moduleFixture: TestingModule = await Test.createTestingModule({
		imports: [
			MongooseModule.forRoot(mongoUri),
			MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
			UserModule,
			LikesModule,
			AuthModule
		],
	}).compile();

	likesService = moduleFixture.get<LikesService>(LikesService);
	userService = moduleFixture.get<UserService>(UserService);
	userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));
	conversationModel = moduleFixture.get<Model<Conversation>>(getModelToken(Conversation.name));
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await conversationModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
});

describe('❤️  LikesService', () => {
	it('Should be defined', () => {
		expect(likesService).toBeDefined();
	});

	it('Should like a user', async () => {
		const dto: CreateUserDto = mockUser;
		const dto2: CreateUserDto = mockUserMaria;

		const user = await userService.create(dto);
		const user2 = await userService.create(dto2);

		const likeObj: LikeProfile = {
			myProfileId: user.id,
			profileToBeLikedId: user2.id,
		};

		const likeUser = await likesService.likeProfile(likeObj);

		expect(likeUser.liked).toBe(true);
	});

	it('Should match if the other user likes back', async () => {
		const dto: CreateUserDto = mockUser;
		const dto2: CreateUserDto = mockUserMaria;

		const user1 = await userService.create(dto);
		const user2 = await userService.create(dto2);

		// Simula o user2 já ter curtido o user1 (para gerar o match)
		const user2FromDb = await userService.getUserById(user2.id);
		user2FromDb.likedProfiles.push(user1.id);
		await user2FromDb.save();

		// Agora o user1 curte o user2, deve gerar o match
		const likeObj: LikeProfile = {
			myProfileId: user1.id,
			profileToBeLikedId: user2.id,
		};

		const result = await likesService.likeProfile(likeObj);

		expect(result.liked).toBe(true);
		expect(result.match).toBe(true);

		// Verifica no banco se os matches foram adicionados em ambos usuários
		const updatedUser1 = await userService.getUserById(user1.id);
		const updatedUser2 = await userService.getUserById(user2.id);

        // Verifica
		expect(updatedUser1.matches.some(id => id.toString() === user2.id.toString())).toBe(true);
		expect(updatedUser2.matches.some(id => id.toString() === user1.id.toString())).toBe(true);

		// Verifica que likedProfiles e likedYouProfiles foram removidos corretamente
        expect(updatedUser1.likedProfiles.some(id => id.toString() === user2.id.toString())).toBe(false);
        expect(updatedUser2.likedYouProfiles.some(id => id.toString() === user1.id.toString())).toBe(false);
	});

    it('Should unlike a user and remove match if exists', async () => {

        const dto: CreateUserDto = mockUser;
		const dto2: CreateUserDto = mockUserMaria;

		const user1 = await userService.create(dto);
		const user2 = await userService.create(dto2);

        // User1 likes user2
        await likesService.likeProfile({myProfileId : user1.id, profileToBeLikedId : user2.id})

        // User2 likes user1 -> then it matches
        await likesService.likeProfile({myProfileId : user2.id, profileToBeLikedId : user1.id})

        // User1 unlikes user2
        const response = await likesService.unlikeProfile({myProfileId : user1.id, profileToBeLikedId : user2.id});

        expect(response.unliked).toBe(true);

        const updatedUser1 = await userService.getUserById(user1.id);
	    const updatedUser2 = await userService.getUserById(user2.id);

        // likedProfiles e likedYouProfiles devem estar limpos
        expect(updatedUser1.likedProfiles.some(id => id.toString() === user2.id.toString())).toBe(false);
        expect(updatedUser2.likedYouProfiles.some(id => id.toString() === user1.id.toString())).toBe(false);

        // matches também devem ter sido removidos
        expect(updatedUser1.matches.some(id => id.toString() === user2.id.toString())).toBe(false);
        expect(updatedUser2.matches.some(id => id.toString() === user1.id.toString())).toBe(false);
        
    })

	it('Should not allow liking yourself', async () => {
		const user = await userService.create(mockUser);

		await expect(
			likesService.likeProfile({ myProfileId: user.id, profileToBeLikedId: user.id }),
		).rejects.toThrow(BadRequestException);
	});

	it('Should create an active conversation when it matches', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });
		const result = await likesService.likeProfile({ myProfileId: user2.id, profileToBeLikedId: user1.id });

		expect(result.match).toBe(true);
		expect(result.conversationId).toBeDefined();

		const conversation = await conversationModel.findById(result.conversationId);
		expect(conversation?.isActive).toBe(true);
		expect(conversation?.participants.map(p => p.toString())).toEqual(
			expect.arrayContaining([user1.id, user2.id]),
		);

		// A conversa fica salva no perfil dos dois
		const updatedUser1 = await userService.getUserById(user1.id);
		const updatedUser2 = await userService.getUserById(user2.id);
		expect(updatedUser1.conversations.some(id => id.toString() === result.conversationId)).toBe(true);
		expect(updatedUser2.conversations.some(id => id.toString() === result.conversationId)).toBe(true);
	});

	it('Should return alreadyLiked when liking someone you already matched', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });
		await likesService.likeProfile({ myProfileId: user2.id, profileToBeLikedId: user1.id });

		const result = await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

		expect(result.liked).toBe(false);
		expect(result.alreadyLiked).toBe(true);
		expect(result.match).toBe(true);
	});

	it('Should archive the conversation when a match is undone', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });
		const { conversationId } = await likesService.likeProfile({ myProfileId: user2.id, profileToBeLikedId: user1.id });

		await likesService.unlikeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

		const conversation = await conversationModel.findById(conversationId);
		expect(conversation?.isActive).toBe(false);
		expect(conversation?.archivedAt).toBeDefined();
	});

	it('Should reactivate the same conversation on a new match', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });
		const firstMatch = await likesService.likeProfile({ myProfileId: user2.id, profileToBeLikedId: user1.id });

		await likesService.unlikeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

		await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });
		const secondMatch = await likesService.likeProfile({ myProfileId: user2.id, profileToBeLikedId: user1.id });

		expect(secondMatch.match).toBe(true);
		expect(secondMatch.conversationId).toBe(firstMatch.conversationId);
		expect(await conversationModel.countDocuments()).toBe(1);

		const conversation = await conversationModel.findById(secondMatch.conversationId);
		expect(conversation?.isActive).toBe(true);
	});

	it('Should pass a profile only once', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		const response = await likesService.passProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });
		await likesService.passProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

		expect(response.passed).toBe(true);

		const updatedUser1 = await userService.getUserById(user1.id);
		expect(updatedUser1.passedProfiles.filter(id => id.toString() === user2.id).length).toBe(1);
	});

	it('Should remove the pass if the user likes the profile later', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		await likesService.passProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });
		await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

		const updatedUser1 = await userService.getUserById(user1.id);
		expect(updatedUser1.passedProfiles.some(id => id.toString() === user2.id)).toBe(false);
		expect(updatedUser1.likedProfiles.some(id => id.toString() === user2.id)).toBe(true);
	});

	it('Should return my matches and who liked me', async () => {
		const user1 = await userService.create(mockUser);
		const user2 = await userService.create(mockUserMaria);

		await likesService.likeProfile({ myProfileId: user2.id, profileToBeLikedId: user1.id });

		const received = await likesService.getLikesReceived(user1.id);
		expect(received.map((u: any) => u.id)).toContain(user2.id);

		await likesService.likeProfile({ myProfileId: user1.id, profileToBeLikedId: user2.id });

		const matches = await likesService.getMatches(user1.id);
		expect(matches.map((u: any) => u.id)).toEqual([user2.id]);

		// Depois do match, a curtida sai da lista de "curtiram você"
		const receivedAfterMatch = await likesService.getLikesReceived(user1.id);
		expect(receivedAfterMatch.map((u: any) => u.id)).not.toContain(user2.id);
	});
});
