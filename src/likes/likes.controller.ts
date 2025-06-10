import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { User } from 'src/auth/decorators/user.decorator';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LikeUserDto } from './dto/likes.dto';
import mongoose from 'mongoose';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('❤️ Likes')
@UseGuards(JwtAuthGuard)
@Controller('likes')
export class LikesController {
	constructor(private readonly likesService: LikesService) {}

	@Post()
	async likeUser(@Body() data: LikeUserDto) {
		
		// Mudaria aqui a lógica apenas do controller... 
		
		const myProfile = new mongoose.Types.ObjectId(data.myProfileId);
		const likedProfile = new mongoose.Types.ObjectId(data.profileToBeLikedId);

		const result = await this.likesService.likeProfile({
			myProfileId: myProfile,
			profileToBeLikedId: likedProfile,
		});

		return result;
	}

	@Post('/unlike')
	async unlikeUser(@Body() data: LikeUserDto) {
		const myProfile = new mongoose.Types.ObjectId(data.myProfileId);
		const likedProfile = new mongoose.Types.ObjectId(data.profileToBeLikedId);

		const result = await this.likesService.unlikeProfile({
			myProfileId: myProfile,
			profileToBeLikedId: likedProfile,
		});

		return result;
	}
}
