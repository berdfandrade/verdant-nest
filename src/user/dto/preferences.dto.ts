import { IsOptional, IsArray, IsNumber, IsString, IsBoolean} from 'class-validator';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';


export class AdvancedFiltersDto {
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


export class PreferencesDto {
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
