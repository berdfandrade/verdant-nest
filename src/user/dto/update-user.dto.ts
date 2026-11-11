import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/*
	Campos que o próprio usuário NÃO pode alterar pela rota PUT /users/:id.
	Likes, matches e conversas são controlados pelos módulos de likes/conversas,
	e premium/verified/active pelo admin.
*/
export const PROTECTED_USER_FIELDS = [
	'premium',
	'verified',
	'active',
	'refreshToken',
	'matches',
	'likedProfiles',
	'likedYouProfiles',
	'conversations',
] as const;

export class UpdateUserDto extends PartialType(
	OmitType(CreateUserDto, PROTECTED_USER_FIELDS),
) {}
