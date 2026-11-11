import { IsBoolean } from 'class-validator';

export class SetPremiumDto {
	@IsBoolean()
	premium: boolean;
}
