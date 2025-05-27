import { User } from '../user.schema';
import { UserSchema } from '../user.schema';

// Talvez esse método não seja ideal dessa maneira
UserSchema.statics.showNearbyUsers = async function (
	myProfile: User,
	maxDistanceKm = 10,
): Promise<User[]> {
	const [longitude, latitude] = myProfile.location.coordinates;
	const maxDistanceMeters = maxDistanceKm * 1000;

	return this.aggregate([
		{
			$geoNear: {
				near: {
					type: 'Point',
					coordinates: [longitude, latitude],
				},
				distanceField: 'distance',
				spherical: true,
				maxDistance: maxDistanceMeters,
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
};

UserSchema.index({ location: '2dsphere' });

export { UserSchema };
