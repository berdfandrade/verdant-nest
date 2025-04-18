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
    IsNumber,
    Length,
    Min,
    Max,
    ValidateNested,
    IsIn,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  class PhotoDto {
    @IsString()
    url: string;
  
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    uploadDate?: Date;
  }
  
  class AboutDto {
    @IsOptional()
    @IsNumber()
    height?: number;
  
    @IsOptional()
    @IsString()
    physicalExercise?: string;
  
    @IsOptional()
    @IsString()
    education?: string;
  
    @IsOptional()
    @IsString()
    drinking?: string;
  
    @IsOptional()
    @IsString()
    smoking?: string;
  
    @IsOptional()
    @IsString()
    lookingFor?: string;
  
    @IsOptional()
    @IsString()
    children?: string;
  
    @IsOptional()
    @IsString()
    zodiacSign?: string;
  
    @IsOptional()
    @IsString()
    politics?: string;
  
    @IsOptional()
    @IsString()
    religion?: string;
  }
  
  class AdvancedFiltersDto {
    @IsOptional()
    @IsBoolean()
    verified?: boolean;
  
    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    height?: number[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    education?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    alcohol?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    smoking?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    children?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    zodiacSign?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    politicalView?: string[];
  
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    religion?: string[];
  }
  
  class PreferencesDto {
    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    ageRange?: number[];
  
    @IsOptional()
    @IsString()
    distance?: string;
  
    @IsOptional()
    @ValidateNested()
    @Type(() => AdvancedFiltersDto)
    advancedFilters?: AdvancedFiltersDto;
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
  