import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserService } from '../user/user.service';

export interface LikeReponse {
	liked: boolean;
	match?: boolean;
	alreadyLiked?: boolean;
}

export interface ILikeProfile {
	profileToBeLikedId: Types.ObjectId;
	myProfileId: Types.ObjectId;
}

@Injectable()
export class LikesService {
	constructor(private readonly userService: UserService) {}

	async likeProfile({ profileToBeLikedId, myProfileId }: ILikeProfile): Promise<LikeReponse> {

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

		myUser.likedProfiles.push(profileToBeLikedId);
		targetUser.likedYouProfiles.push(myProfileId);

		if (theyLikedMe) {
			myUser.matches.push(profileToBeLikedId);
			targetUser.matches.push(myProfileId);

			myUser.likedProfiles = myUser.likedProfiles.filter(
				id => !id.equals(profileToBeLikedId),
			);
			targetUser.likedYouProfiles = targetUser.likedYouProfiles.filter(
				id => !id.equals(myProfileId),
			);
		}

		await Promise.all([myUser.save(), targetUser.save()]);

		return {
			liked: true,
			match: theyLikedMe,
		};
	}
}
