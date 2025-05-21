import { Controller, Post, UseGuards, Param, Req, Body } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LikeUserDto } from './dto/likes.dto';
import mongoose, { mongo } from 'mongoose';
import ObjectId from 'mongoose';

@UseGuards(JwtAuthGuard)
@Controller('likes')
export class LikesController {
	constructor(private readonly likesService: LikesService) {}

	@Post()
	async likeUser(@Body() data : LikeUserDto) {

    const myProfile = new mongoose.Types.ObjectId(data.myProfileId)
    const likedProfile = new mongoose.Types.ObjectId(data.profileToBeLikedId)

		const result = await this.likesService.likeProfile({
      myProfileId : myProfile, 
      profileToBeLikedId : likedProfile
    });

		return result;
	}
}
