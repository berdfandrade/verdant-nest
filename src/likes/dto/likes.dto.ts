import { IsMongoId } from 'class-validator';

/*
	O perfil de quem curte vem sempre do token (usuário autenticado),
	então o body só precisa do perfil alvo.
*/
export class LikeUserDto {
	@IsMongoId()
	profileToBeLikedId: string;
}
