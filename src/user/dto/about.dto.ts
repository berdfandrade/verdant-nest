import { IsOptional, IsString, IsNumber } from 'class-validator';

export class AboutDto {
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
