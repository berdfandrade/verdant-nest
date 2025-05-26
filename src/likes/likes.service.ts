import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserService } from '../user/user.service';
import { ConversationService } from '../conversation/conversation.service';

export interface LikeReponse {
	liked: boolean;
	match?: boolean;
	alreadyLiked?: boolean;
}

export interface LikeProfile {
	profileToBeLikedId: Types.ObjectId;
	myProfileId: Types.ObjectId;
}

export interface UnlikeProfile {
	myProfileId;
	profileToBeLikedId: Types.ObjectId;
}

export interface UnlikeProfileResponse {
	unliked: boolean;
}

@Injectable()
export class LikesService {
	constructor(
		private readonly userService: UserService,
		private readonly conversationService: ConversationService,
	) {}

	async likeProfile({ profileToBeLikedId, myProfileId }: LikeProfile): Promise<LikeReponse> {
		const myUser = await this.userService.getUserById(myProfileId);
		const targetUser = await this.userService.getUserById(profileToBeLikedId);

		if (!myUser || !targetUser) {
			throw new NotFoundException('User or user to be liked not found');
		}

		const alreadyLiked = myUser.likedProfiles.some(
			id => id.toString() === profileToBeLikedId.toString(),
		);

		if (alreadyLiked) {
			return { liked: false, alreadyLiked: true };
		}

		const theyLikedMe = targetUser.likedProfiles.some(
			id => id.toString() === myProfileId.toString(),
		);

		myUser.likedProfiles.push(new Types.ObjectId(profileToBeLikedId));
		targetUser.likedYouProfiles.push(new Types.ObjectId(myProfileId));

		let matched = false;

		if (theyLikedMe) {
			matched = true;

			myUser.matches.push(new Types.ObjectId(profileToBeLikedId));
			targetUser.matches.push(new Types.ObjectId(myProfileId));

			myUser.likedProfiles = myUser.likedProfiles.filter(
				id => id.toString() !== profileToBeLikedId.toString(),
			);
			targetUser.likedYouProfiles = targetUser.likedYouProfiles.filter(
				id => id.toString() !== myProfileId.toString(),
			);

			await this.conversationService.create({
				participants: [myUser.id, targetUser.id],
			});
		}

		await myUser.save();
		await targetUser.save();

		return {
			liked: true,
			alreadyLiked: false,
			match: theyLikedMe,
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
		myUser.likedProfiles = myUser.likedProfiles.filter(
			id => id.toString() !== profileToBeLikedId.toString(),
		);

		targetUser.likedYouProfiles = targetUser.likedYouProfiles.filter(
			id => id.toString() !== myProfileId.toString(),
		);

		// Remove the match (if exists)
		const isMatch = myUser.matches.some(
			id => id.toString() === profileToBeLikedId.toString(),
		);

		if (isMatch) {
			myUser.matches = myUser.matches.filter(
				id => id.toString() !== profileToBeLikedId.toString(),
			);
			targetUser.matches = targetUser.matches.filter(
				id => id.toString() !== myProfileId.toString(),
			);
		}

		await Promise.all([myUser.save(), targetUser.save()]);

		return { unliked: true };
	}
}
