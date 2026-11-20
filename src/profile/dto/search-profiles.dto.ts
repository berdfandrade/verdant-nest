import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// GET /profile/search?q=lari&online=true
export class SearchProfilesQueryDto {
	// Pelo menos 2 caracteres que não sejam espaço
	@IsString()
	@Matches(/\S.*\S/, { message: 'q must have at least 2 characters' })
	@MaxLength(50)
	q: string;

	// Só quem está com o app aberto agora
	@IsOptional()
	@IsIn(['true', 'false'])
	online?: 'true' | 'false';
}
