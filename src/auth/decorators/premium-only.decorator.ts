import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PremiumGuard } from '../premium.guard';

// Rota só para usuários logados com premium (401 sem token, 403 sem premium)
export function PremiumOnly() {
	return applyDecorators(UseGuards(JwtAuthGuard, PremiumGuard));
}
