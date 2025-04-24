import mongoose from "mongoose";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel} from "@nestjs/mongoose";
import { Model, ObjectId } from "mongoose";
import { NotFoundError } from "rxjs";
import { User } from "src/user/user.schema";
import { UserService } from "src/user/user.service";

@Injectable()
export class LikesService {
    constructor(@InjectModel(User.name) private userModel : Model<User>,
    private readonly userService : UserService
) {}

    async likeProfile(myProfileId : string, profileToBeLikedId : string){
        try {

            const myUserId = new mongoose.Types.ObjectId(myProfileId)
            const otherUserId = new mongoose.Types.ObjectId(profileToBeLikedId)

            const myUser = await this.userService.getUserById(myProfileId)
            const profileToBeLiked = await this.userService.getUserById(profileToBeLikedId)

            if(!myUser || !profileToBeLiked) {
                throw new NotFoundException('User or user to be liked not found')
            }

            if(myUser.likedProfiles.includes(otherUserId)) return 

            myUser.likedProfiles.push(otherUserId)

            const isAMatch = 
            myUser.likedProfiles.includes(otherUserId) 
            && profileToBeLiked.likedProfiles.includes(myUserId)

            // Terminar a lógica
            if(isAMatch) return 'is a match'

        } catch (error) {
            throw new Error('An error ocurred on like the profile')
        }
    }
}