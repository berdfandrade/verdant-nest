import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

		// Bloqueio em qualquer direção impede curtir
		if (hasId(myUser.blockedUsers ?? [], profileToBeLikedId) || hasId(targetUser.blockedUsers ?? [], myProfileId)) {
			throw new ForbiddenException('You can not interact with this user');
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

	// Quem me curtiu (e ainda não virou match)
	async getLikesReceived(myProfileId: Types.ObjectId | string) {
		const me = await this.userModel
			.findById(myProfileId)
			.populate({ path: 'likedYouProfiles', select: PUBLIC_PROFILE_FIELDS, match: { active: true } });

		if (!me) throw new NotFoundException('User does not exist');
		return me.likedYouProfiles;
	}
}
