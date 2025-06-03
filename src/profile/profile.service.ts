import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common/';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserModel } from '../user/user.schema';
import { UpdatePreferencesDto } from 'src/user/dto/update-preferences.dto';
import { UpdateAboutDto } from 'src/user/dto/update-about.dto';

/*
    ProfileService:
    Responsável por tudo que envolve como o usuário interage com seu próprio perfil.
    Exibe perfis, configurações, atualizações de preferências, denúncia, etc.
*/

@Injectable()
export class ProfileService {
	constructor(@InjectModel(User.name) private userModel: UserModel) {}

	async showMeProfiles(myProfileId: Types.ObjectId) {
		const myProfile = await this.userModel.findById(myProfileId);

		if (!myProfile) throw new NotFoundException('Profile not found');
		if (!myProfile.location?.coordinates)
			throw new NotFoundException('User location not found');

		const [longitude, latitude] = myProfile.location.coordinates;

		if (typeof longitude !== 'number' || typeof latitude !== 'number') {
			throw new BadRequestException('Invalid user coordinates');
		}

		const distanceInKm = parseFloat(myProfile.preferences?.distance || '10');
		const maxDistance = distanceInKm * 1000; // convert to meters

		const nearbyUsers = await this.userModel.aggregate([
			{
				$geoNear: {
					near: {
						type: 'Point',
						coordinates: [longitude, latitude],
					},
					distanceField: 'distance',
					spherical: true,
					maxDistance: maxDistance,
				},
			},
			{
				$match: {
					_id: { $ne: myProfile._id },
					active: true,
				},
			},
			{
				$limit: 50,
			},
		]);

		return nearbyUsers;
	}

	async showMeMyPreferences(myProfileId: Types.ObjectId) {
		const myProfile = await this.userModel.findById(myProfileId);
		if (!myProfile) throw new NotFoundException('Profile not found');
		return myProfile.preferences;
	}

	async changeMyConfigs(myProfileId: Types.ObjectId, preferences: UpdatePreferencesDto) {
		const myProfile = await this.userModel.findById(myProfileId);
		if (!myProfile) throw new NotFoundException('Profile not found');

		myProfile.preferences = {
			...myProfile.preferences,
			...preferences,
			advancedFilters: {
				...myProfile.preferences?.advancedFilters,
				...preferences.advancedFilters,
			},
		};

		await myProfile.save();
		return { message: 'Preferences updated successfully' };
	}

	async showMeAboutMe(myProfileId: Types.ObjectId) {
		const myProfile = await this.userModel.findById(myProfileId);
		if (!myProfile) throw new NotFoundException('Profile not found');
		return myProfile.about;
	}

	async changeAboutMe(myProfileId: Types.ObjectId, about: UpdateAboutDto) {
		const myProfile = await this.userModel.findById(myProfileId);
		if (!myProfile) throw new NotFoundException('Profile not found');

		myProfile.about = {
			...myProfile.about,
			...about,
		};

		await myProfile.save();
		return { message: 'About updated successfully' };
	}
}
