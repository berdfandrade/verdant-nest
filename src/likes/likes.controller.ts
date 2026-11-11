import { Controller, Post, UseGuards, Body, Get } from '@nestjs/common';
import { User } from '../auth/decorators/user.decorator';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LikeUserDto } from './dto/likes.dto';
import mongoose from 'mongoose';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('❤️ Likes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('likes')
export class LikesController {
	constructor(private readonly likesService: LikesService) {}

	@Post()
	async likeUser(@User() user: any, @Body() data: LikeUserDto) {
		return this.likesService.likeProfile({
			myProfileId: user._id,
			profileToBeLikedId: new mongoose.Types.ObjectId(data.profileToBeLikedId),
		});
	}

	@Post('/unlike')
	async unlikeUser(@User() user: any, @Body() data: LikeUserDto) {
		return this.likesService.unlikeProfile({
			myProfileId: user._id,
			profileToBeLikedId: new mongoose.Types.ObjectId(data.profileToBeLikedId),
		});
	}

	@Post('/pass')
	async passUser(@User() user: any, @Body() data: LikeUserDto) {
		return this.likesService.passProfile({
			myProfileId: user._id,
			profileToBeLikedId: new mongoose.Types.ObjectId(data.profileToBeLikedId),
		});
	}

	@Get('/matches')
	async matches(@User() user: any) {
		return this.likesService.getMatches(user._id);
	}

	@Get('/received')
	async received(@User() user: any) {
		return this.likesService.getLikesReceived(user._id);
	}
}
