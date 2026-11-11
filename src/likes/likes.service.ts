import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserService } from '@/user/user.service';
import { ConversationService } from '@/conversation/conversation.service';
import { User } from '@/user/user.schema';
import MongoDbUtils from '@/utils/MongoDB.utils';

export interface LikeReponse {
	liked: boolean;
	match?: boolean;
	alreadyLiked?: boolean;
	conversationId?: string;
}

export interface LikeProfile {
	profileToBeLikedId: Types.ObjectId;
	myProfileId: Types.ObjectId;
}

export interface UnlikeProfile {
	myProfileId: Types.ObjectId;
	profileToBeLikedId: Types.ObjectId;
}

export interface UnlikeProfileResponse {
	unliked: boolean;
}

export interface PassProfileResponse {
	passed: boolean;
}

export interface SuperLikeResponse extends LikeReponse {
	superLike: boolean;
	superLikesLeft: number;
}

export interface SuperLikeStatus {
	limit: number;
	used: number;
	left: number;
	/** Quando o super like mais antigo da janela expira (libera mais um) */
	nextResetAt: Date | null;
}

// Perfil público de quem me curtiu + se foi super like
export type ReceivedLike = Record<string, any> & { superLike: boolean };

export const SUPER_LIKES_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

// Campos públicos exibidos nas listas de matches/curtidas
const PUBLIC_PROFILE_FIELDS = 'fullName username photos birthDate gender verified description interests';

const removeId = (list: Types.ObjectId[], id: Types.ObjectId | string) =>
	list.filter(item => !MongoDbUtils.sameId(item, id));

const hasId = (list: Types.ObjectId[], id: Types.ObjectId | string) =>
	list.some(item => MongoDbUtils.sameId(item, id));

@Injectable()
export class LikesService {
	constructor(
		private readonly userService: UserService,
		private readonly conversationService: ConversationService,
		@InjectModel(User.name) private readonly userModel: Model<User>,
	) {}

	async likeProfile({ profileToBeLikedId, myProfileId }: LikeProfile): Promise<LikeReponse> {
		if (MongoDbUtils.sameId(myProfileId, profileToBeLikedId)) {
			throw new BadRequestException('You can not like yourself');
		}

		const myUser = await this.userService.getUserById(myProfileId);
		const targetUser = await this.userService.getUserById(profileToBeLikedId);

		if (!myUser || !targetUser) {
			throw new NotFoundException('User or user to be liked not found');
		}

		const alreadyLiked = hasId(myUser.likedProfiles, profileToBeLikedId);
		const alreadyMatched = hasId(myUser.matches, profileToBeLikedId);

		if (alreadyLiked || alreadyMatched) {
			return { liked: false, alreadyLiked: true, match: alreadyMatched };
		}

		const theyLikedMe = hasId(targetUser.likedProfiles, myProfileId);

		// Se eu tinha "passado" esse perfil antes, desfaz o pass
		myUser.passedProfiles = removeId(myUser.passedProfiles ?? [], profileToBeLikedId);

		if (!theyLikedMe) {
			myUser.likedProfiles.push(new Types.ObjectId(profileToBeLikedId));
			targetUser.likedYouProfiles.push(new Types.ObjectId(myProfileId));

			await Promise.all([myUser.save(), targetUser.save()]);
			return { liked: true, alreadyLiked: false, match: false };
		}

		// ---- Match! ----
		// O like pendente vira match: limpa as listas de likes dos dois lados
		myUser.likedProfiles = removeId(myUser.likedProfiles, profileToBeLikedId);
		myUser.likedYouProfiles = removeId(myUser.likedYouProfiles, profileToBeLikedId);
		targetUser.likedProfiles = removeId(targetUser.likedProfiles, myProfileId);
		targetUser.likedYouProfiles = removeId(targetUser.likedYouProfiles, myProfileId);
		// Super like pendente também deixa de existir quando vira match
		myUser.superLikedBy = removeId(myUser.superLikedBy ?? [], profileToBeLikedId);
		targetUser.superLikedBy = removeId(targetUser.superLikedBy ?? [], myProfileId);

		myUser.matches.push(new Types.ObjectId(profileToBeLikedId));
		targetUser.matches.push(new Types.ObjectId(myProfileId));

		const conversation = await this.conversationService.createOrReactivate(
			myUser.id,
			targetUser.id,
		);

		if (!hasId(myUser.conversations, conversation.id)) myUser.conversations.push(conversation._id as Types.ObjectId);
		if (!hasId(targetUser.conversations, conversation.id)) targetUser.conversations.push(conversation._id as Types.ObjectId);

		await Promise.all([myUser.save(), targetUser.save()]);

		return {
			liked: true,
			alreadyLiked: false,
			match: true,
			conversationId: conversation.id,
		};
	}

	async unlikeProfile({
		profileToBeLikedId,
		myProfileId,
	}: LikeProfile): Promise<UnlikeProfileResponse> {
		const myUser = await this.userService.getUserById(myProfileId);
		const targetUser = await this.userService.getUserById(profileToBeLikedId);

		if (!myUser || !targetUser) throw new NotFoundException('User or target user not found');

		// Remove the like (if exists)
		myUser.likedProfiles = removeId(myUser.likedProfiles, profileToBeLikedId);
		targetUser.likedYouProfiles = removeId(targetUser.likedYouProfiles, myProfileId);
		targetUser.superLikedBy = removeId(targetUser.superLikedBy ?? [], myProfileId);

		// Remove the match (if exists)
		const isMatch = hasId(myUser.matches, profileToBeLikedId);

		if (isMatch) {
			myUser.matches = removeId(myUser.matches, profileToBeLikedId);
			targetUser.matches = removeId(targetUser.matches, myProfileId);

			// O match acabou: a conversa é arquivada
			await this.conversationService.deactivateBetweenUsers(myProfileId, profileToBeLikedId);
		}

		await Promise.all([myUser.save(), targetUser.save()]);

		return { unliked: true };
	}

	// "Passar" um perfil: ele não aparece mais no feed
	async passProfile({ profileToBeLikedId, myProfileId }: LikeProfile): Promise<PassProfileResponse> {
		if (MongoDbUtils.sameId(myProfileId, profileToBeLikedId)) {
			throw new BadRequestException('You can not pass yourself');
		}

		// Garante que o perfil alvo existe
		await this.userService.getUserById(profileToBeLikedId);

		await this.userModel.updateOne(
			{ _id: myProfileId },
			{ $addToSet: { passedProfiles: new Types.ObjectId(profileToBeLikedId) } },
		);

		return { passed: true };
	}

	async getMatches(myProfileId: Types.ObjectId | string) {
		const me = await this.userModel
			.findById(myProfileId)
			.populate({ path: 'matches', select: PUBLIC_PROFILE_FIELDS, match: { active: true } });

		if (!me) throw new NotFoundException('User does not exist');
		return me.matches;
	}

	// Quem me curtiu (e ainda não virou match). Super likes vêm primeiro, marcados
	async getLikesReceived(myProfileId: Types.ObjectId | string) {
		const me = await this.userModel
			.findById(myProfileId)
			.populate({ path: 'likedYouProfiles', select: PUBLIC_PROFILE_FIELDS, match: { active: true } });

		if (!me) throw new NotFoundException('User does not exist');

		const profiles = (me.likedYouProfiles as unknown as User[]).map((profile): ReceivedLike => ({
			...(profile.toJSON() as Record<string, any>),
			// Mantém o `id` (virtual do Mongoose) que o documento tinha
			id: String(profile._id),
			superLike: hasId(me.superLikedBy ?? [], profile._id as Types.ObjectId),
		}));

		// sort estável: entre super likes (e entre likes comuns) mantém a ordem original
		return profiles.sort((a, b) => Number(b.superLike) - Number(a.superLike));
	}

	// ---- Premium ----

	getSuperLikeStatus(history: Date[] = [], now = new Date()): SuperLikeStatus {
		const recent = history.filter(date => now.getTime() - new Date(date).getTime() < DAY_MS);
		const oldest = recent.reduce<Date | null>((min, date) => (!min || date < min ? date : min), null);

		return {
			limit: SUPER_LIKES_PER_DAY,
			used: recent.length,
			left: Math.max(0, SUPER_LIKES_PER_DAY - recent.length),
			nextResetAt: oldest ? new Date(new Date(oldest).getTime() + DAY_MS) : null,
		};
	}

	async superLikeStatus(myProfileId: Types.ObjectId | string): Promise<SuperLikeStatus> {
		const me = await this.userService.getUserById(myProfileId);
		return this.getSuperLikeStatus(me.superLikeHistory);
	}

	/*
		Super like: um like que aparece em destaque para a outra pessoa.
		Limite de SUPER_LIKES_PER_DAY a cada 24h. Também transforma um like comum já
		enviado em super like. Não gasta nada se já houver match.
	*/
	async superLike({ profileToBeLikedId, myProfileId }: LikeProfile): Promise<SuperLikeResponse> {
		const me = await this.userService.getUserById(myProfileId);
		const now = new Date();
		const status = this.getSuperLikeStatus(me.superLikeHistory, now);

		if (status.left === 0) {
			throw new HttpException('Daily super like limit reached', HttpStatus.TOO_MANY_REQUESTS);
		}

		const like = await this.likeProfile({ profileToBeLikedId, myProfileId });

		// Já tinha match: nada para destacar
		if (like.match && like.alreadyLiked) {
			return { ...like, superLike: false, superLikesLeft: status.left };
		}

		const recentHistory = (me.superLikeHistory ?? []).filter(date => now.getTime() - new Date(date).getTime() < DAY_MS);

		await Promise.all([
			this.userModel.updateOne({ _id: me._id }, { $set: { superLikeHistory: [...recentHistory, now] } }),
			// Se virou match, não há mais "curtida pendente" para destacar
			like.match
				? Promise.resolve()
				: this.userModel.updateOne(
						{ _id: profileToBeLikedId },
						{ $addToSet: { superLikedBy: new Types.ObjectId(myProfileId) } },
					),
		]);

		return { ...like, liked: true, superLike: true, superLikesLeft: status.left - 1 };
	}

	// Desfaz o último pass: o perfil volta para o feed
	async rewindLastPass(myProfileId: Types.ObjectId | string) {
		const me = await this.userService.getUserById(myProfileId);
		const lastPassed = me.passedProfiles?.at(-1);
		if (!lastPassed) throw new NotFoundException('Nothing to rewind');

		// $pop remove o último item ($addToSet sempre adiciona no fim)
		await this.userModel.updateOne({ _id: me._id }, { $pop: { passedProfiles: 1 } });

		const profile = await this.userModel.findById(lastPassed).select(PUBLIC_PROFILE_FIELDS);
		return { rewound: true, profile };
	}
}
