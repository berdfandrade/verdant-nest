import { IsLatitude, IsLongitude } from 'class-validator';

export class UpdateLocationDto {
	@IsLongitude()
	longitude: number;

	@IsLatitude()
	latitude: number;
}
