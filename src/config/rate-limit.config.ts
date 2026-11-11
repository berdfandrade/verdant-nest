import { minutes } from '@nestjs/throttler';

/*
	Rate limiting.
	- HTTP: @nestjs/throttler, por IP (atrás de proxy, defina TRUST_PROXY)
	- WebSocket (send_message): contador no Redis, por usuário

	RATE_LIMIT_ENABLED=true|false (padrão: ligado, exceto em NODE_ENV=test,
	para os testes que fazem vários logins não esbarrarem no limite).
	Lido em tempo de execução, a cada requisição.
*/
export const RateLimitConfig = {
	get enabled(): boolean {
		const value = process.env.RATE_LIMIT_ENABLED;
		if (value !== undefined) return value === 'true';
		return process.env.NODE_ENV !== 'test';
	},
};

export const RATE_LIMITS = {
	// Padrão para qualquer rota HTTP
	default: { limit: 120, ttl: minutes(1) },
	// Força bruta de senha
	login: { limit: 5, ttl: minutes(1) },
	refresh: { limit: 20, ttl: minutes(1) },
	// Criação de contas em massa
	signup: { limit: 10, ttl: minutes(60) },
	sendMessage: { limit: 30, ttl: minutes(1) },
	// Mensagens pelo socket: no máximo `limit` a cada `windowSeconds`
	socketMessages: { limit: 20, windowSeconds: 10 },
} as const;
