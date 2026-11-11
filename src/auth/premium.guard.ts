import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/*
	Libera a rota só para usuários premium.
	Precisa rodar depois do JwtAuthGuard (que coloca o usuário em request.user).
*/
@Injectable()
export class PremiumGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const user = context.switchToHttp().getRequest().user;
		if (!user?.premium) throw new ForbiddenException('This is a premium feature');
		return true;
	}
}
