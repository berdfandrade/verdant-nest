import { IsString } from 'class-validator';

export class LikeUserDto {
	@IsString()
	myProfileId: string;

	@IsString()
	profileToBeLikedId: string;
}
