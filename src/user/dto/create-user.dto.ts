import {
	IsArray,
	IsBoolean,
	IsDate,
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsPhoneNumber,
	IsString,
	IsMongoId,
	Length,
	ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PreferencesDto } from './preferences.dto';
import { AboutDto } from './about.dto';

class PhotoDto {
	@IsString()
	url: string;

	@IsOptional()
	@IsDate()
	@Type(() => Date)
	uploadDate?: Date;
}

export class CreateUserDto {
	@IsOptional()
	@IsBoolean()
	premium?: boolean;

	@IsOptional()
	@IsBoolean()
	active?: boolean;

	@IsOptional()
	@IsBoolean()
	verified?: boolean;

	@IsOptional()
	@IsString()
	username?: string;

	@IsEmail()
	email: string;

	@IsNotEmpty()
	@Length(6, 64)
	password: string;

	@IsNotEmpty()
	fullName: string;

	@IsPhoneNumber()
	phoneNumber: string;

	@IsDate()
	@Type(() => Date)
	birthDate: Date;

	@IsOptional()
	@Type(() => Object)
	location?: {
		type: string;
		coordinates: number[];
	};

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	profession?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	showMe?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	description?: string[];

	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => PhotoDto)
	photos?: PhotoDto[];

	@IsOptional()
	@ValidateNested()
	@Type(() => AboutDto)
	about?: AboutDto;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	languages?: string[];

	@IsOptional()
	@IsArray()
	@IsMongoId({ each: true })
	conversations?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	connectedAccounts?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	interests?: string[];

	@IsOptional()
	@IsArray()
	@IsMongoId({ each: true })
	matches?: string[];

	@IsOptional()
	@IsArray()
	@IsMongoId({ each: true })
	likedProfiles?: string[];

	@IsOptional()
	@IsArray()
	@IsMongoId({ each: true })
	likedYouProfiles?: string[];

	@IsOptional()
	@ValidateNested()
	@Type(() => PreferencesDto)
	preferences?: PreferencesDto;
}
