import mongoose, { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, INestApplication, NotFoundException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SetupTestApp } from '@test/test-setup';
import { User } from '@/user/user.schema';
import { UserService } from '@/user/user.service';
import { LikesService } from '@/likes/likes.service';
import { ProfileService } from '@/profile/profile.service';
import { Conversation } from '@/conversation/schemas/conversation.schema';
import { mockUser, mockUserMaria } from '@/user/test/mock/user.mock';
import { SafetyService } from '../safety.service';
import { Report } from '../report.schema';

let app: INestApplication;
let mongoServer: MongoMemoryServer;
let safetyService: SafetyService;
let userService: UserService;
let likesService: LikesService;
let profileService: ProfileService;
let userModel: Model<User>;
let conversationModel: Model<Conversation>;
let reportModel: Model<Report>;

beforeAll(async () => {
	const { app: testApp, moduleFixture, mongoServer: server } = await SetupTestApp();

	app = testApp;
	mongoServer = server;
	safetyService = moduleFixture.get(SafetyService);
	userService = moduleFixture.get(UserService);
	likesService = moduleFixture.get(LikesService);
	profileService = moduleFixture.get(ProfileService);
	userModel = moduleFixture.get(getModelToken(User.name));
	conversationModel = moduleFixture.get(getModelToken(Conversation.name));
	reportModel = moduleFixture.get(getModelToken(Report.name));
	await userModel.createIndexes(); // 2dsphere para o feed
});

beforeEach(async () => {
	await userModel.deleteMany({});
	await conversationModel.deleteMany({});
	await reportModel.deleteMany({});
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
	await app.close();
});

// Bernardo e Maria com match e conversa ativa
const createMatch = async () => {
	const bernardo = await userService.create(mockUser);
	const maria = await userService.create(mockUserMaria);
	await likesService.likeProfile({ myProfileId: bernardo.id, profileToBeLikedId: maria.id });
	const { conversationId } = await likesService.likeProfile({ myProfileId: maria.id, profileToBeLikedId: bernardo.id });
	return { bernardo, maria, conversationId };
};

const has = (list: unknown[] | undefined, id: string) => (list ?? []).some(item => String(item) === id);

describe('🛡️ SafetyService', () => {
	describe('🚫 block', () => {
		it('should undo the match on both sides and archive the conversation', async () => {
			const { bernardo, maria, conversationId } = await createMatch();

			const response = await safetyService.block(bernardo.id, maria.id);
			expect(response.blocked).toBe(true);

			const updatedBernardo = await userModel.findById(bernardo.id);
			const updatedMaria = await userModel.findById(maria.id);

			expect(has(updatedBernardo!.blockedUsers, maria.id)).toBe(true);
			expect(has(updatedBernardo!.matches, maria.id)).toBe(false);
			expect(has(updatedMaria!.matches, bernardo.id)).toBe(false);

			const conversation = await conversationModel.findById(conversationId);
			expect(conversation?.isActive).toBe(false);
		});

		it('should remove pending likes in both directions', async () => {
			const bernardo = await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);
			await likesService.likeProfile({ myProfileId: maria.id, profileToBeLikedId: bernardo.id });

			await safetyService.block(bernardo.id, maria.id);

			const updatedBernardo = await userModel.findById(bernardo.id);
			const updatedMaria = await userModel.findById(maria.id);
			expect(has(updatedBernardo!.likedYouProfiles, maria.id)).toBe(false);
			expect(has(updatedMaria!.likedProfiles, bernardo.id)).toBe(false);
		});

		it('should not block yourself or a user that does not exist', async () => {
			const bernardo = await userService.create(mockUser);

			await expect(safetyService.block(bernardo.id, bernardo.id)).rejects.toThrow(BadRequestException);
			await expect(safetyService.block(bernardo.id, new mongoose.Types.ObjectId())).rejects.toThrow(NotFoundException);
		});

		it('should block likes in both directions', async () => {
			const bernardo = await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);

			await safetyService.block(bernardo.id, maria.id);

			await expect(
				likesService.likeProfile({ myProfileId: bernardo.id, profileToBeLikedId: maria.id }),
			).rejects.toThrow(ForbiddenException);
			await expect(
				likesService.likeProfile({ myProfileId: maria.id, profileToBeLikedId: bernardo.id }),
			).rejects.toThrow(ForbiddenException);
		});

		it('should hide the blocked user from my feed', async () => {
			const bernardo = await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);

			// Controle: antes do bloqueio a Maria vê o Bernardo
			expect((await profileService.showMeProfiles(maria.id)).length).toBe(1);

			await safetyService.block(maria.id, bernardo.id);

			expect((await profileService.showMeProfiles(maria.id)).length).toBe(0);
		});

		it('should hide me from the feed of whoever I blocked', async () => {
			const bernardo = await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);
			expect((await profileService.showMeProfiles(maria.id)).length).toBe(1);

			// Bernardo bloqueia: a Maria também deixa de ver o Bernardo
			await safetyService.block(bernardo.id, maria.id);

			expect((await profileService.showMeProfiles(maria.id)).length).toBe(0);
		});

		it('should tell if any of the two blocked the other', async () => {
			const bernardo = await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);

			expect(await safetyService.isBlockedBetween(bernardo.id, maria.id)).toBe(false);
			await safetyService.block(maria.id, bernardo.id);
			expect(await safetyService.isBlockedBetween(bernardo.id, maria.id)).toBe(true);
			expect(await safetyService.isBlockedBetween(maria.id, bernardo.id)).toBe(true);
		});
	});

	describe('✅ unblock / list', () => {
		it('should list and unblock users (without restoring the match)', async () => {
			const { bernardo, maria } = await createMatch();
			await safetyService.block(bernardo.id, maria.id);

			const blocked = await safetyService.listBlocked(bernardo.id);
			expect(blocked.map((u: any) => u.fullName)).toEqual([mockUserMaria.fullName]);

			await safetyService.unblock(bernardo.id, maria.id);

			const updated = await userModel.findById(bernardo.id);
			expect(updated!.blockedUsers.length).toBe(0);
			expect(has(updated!.matches, maria.id)).toBe(false);
		});
	});

	describe('🚩 report', () => {
		it('should create an open report and block by default', async () => {
			const bernardo = await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);

			const response = await safetyService.report(bernardo.id, { userId: maria.id, reason: 'spam', details: 'Links suspeitos' });

			expect(response).toMatchObject({ reported: true, blocked: true });
			const report = await reportModel.findById(response.reportId);
			expect(report).toMatchObject({ reason: 'spam', status: 'open', details: 'Links suspeitos' });
			expect(await safetyService.isBlockedBetween(bernardo.id, maria.id)).toBe(true);
		});

		it('should not block when block is false', async () => {
			const bernardo = await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);

			await safetyService.report(bernardo.id, { userId: maria.id, reason: 'fake_profile', block: false });

			expect(await safetyService.isBlockedBetween(bernardo.id, maria.id)).toBe(false);
		});

		it('should update the same open report instead of creating duplicates', async () => {
			const bernardo = await userService.create(mockUser);
			const maria = await userService.create(mockUserMaria);

			await safetyService.report(bernardo.id, { userId: maria.id, reason: 'spam', block: false });
			await safetyService.report(bernardo.id, { userId: maria.id, reason: 'harassment', block: false });

			const reports = await reportModel.find({});
			expect(reports.length).toBe(1);
			expect(reports[0].reason).toBe('harassment');
		});

		it('should not report yourself', async () => {
			const bernardo = await userService.create(mockUser);
			await expect(safetyService.report(bernardo.id, { userId: bernardo.id, reason: 'spam' })).rejects.toThrow(
				BadRequestException,
			);
		});
	});
});
