import mongoose from "mongoose";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model} from "mongoose";
import { User } from "src/user/user.schema";
import { UserService } from "src/user/user.service";

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly userService: UserService
  ) {}

  async likeProfile(myProfileId: string, profileToBeLikedId: string) {
    try {

      const myUser = await this.userService.getUserById(myProfileId);
      const profileToBeLiked =
        await this.userService.getUserById(profileToBeLikedId);

      if (!myUser || !profileToBeLiked)
        throw new NotFoundException("User or user to be liked not found");

      const myUserObjectId = new mongoose.Types.ObjectId(myProfileId);
      const otherUserObjectId = new mongoose.Types.ObjectId(profileToBeLikedId);

      const alreadyLiked = myUser.likedProfiles.some(
        (id) => id.toString() === profileToBeLikedId
      );

      if (alreadyLiked) {
        return { liked: false, alreadyLiked: true };
      }

      const theyLikedMe = profileToBeLiked.likedProfiles.some(
        (id) => id.toString() === myProfileId
      );

      if (theyLikedMe) {
        // 💘 É um match!
        myUser.matches.push(otherUserObjectId);
        profileToBeLiked.matches.push(myUserObjectId);

        // Remove da fila de likes (já virou match)
        myUser.likedProfiles = myUser.likedProfiles.filter(
          (id) => id.toString() !== profileToBeLikedId
        );
        profileToBeLiked.likedYouProfiles =
          profileToBeLiked.likedYouProfiles.filter(
            (id) => id.toString() !== myProfileId
          );
      }

      await myUser.save();
      await profileToBeLiked.save();

      return {
        liked: true,
        match: theyLikedMe,
      };

    } catch (error) {
      throw new Error("An error ocurred on like the profile");
    }
  }
}
