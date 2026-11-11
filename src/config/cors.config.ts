import { INestApplication, INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import type { ServerOptions } from 'socket.io';

/*
	CORS da API (HTTP e WebSocket), lido em tempo de execução.

	CORS_ORIGINS=https://verdant.app,https://admin.verdant.app
	  -> só essas origens (navegadores). "*" libera todas.
	Sem CORS_ORIGINS:
	  - NODE_ENV=production: nenhuma origem de navegador é liberada (e um aviso é logado)
	  - outros ambientes (dev/test): qualquer origem

	Apps nativos (React Native/Expo) não enviam Origin, então não são afetados.
*/

const logger = new Logger('CORS');

export function parseOrigins(value?: string): string[] {
	return (value ?? '')
		.split(',')
		.map(origin => origin.trim().replace(/\/$/, ''))
		.filter(Boolean);
}

export function buildCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
	const origins = parseOrigins(env.CORS_ORIGINS);
	const base: CorsOptions = { credentials: true };

	if (origins.includes('*')) return { ...base, origin: true };
	if (origins.length) return { ...base, origin: origins };

	if (env.NODE_ENV === 'production') {
		logger.warn('CORS_ORIGINS is not set: cross-origin browser requests (HTTP and WebSocket) are blocked');
		return { ...base, origin: false };
	}

	return { ...base, origin: true };
}

// Adapter do Socket.IO que aplica a mesma política de CORS do HTTP
export class CorsIoAdapter extends IoAdapter {
	constructor(
		app: INestApplicationContext,
		private readonly cors: CorsOptions,
	) {
		super(app);
	}

	createIOServer(port: number, options?: ServerOptions) {
		return super.createIOServer(port, { ...options, cors: this.cors } as ServerOptions);
	}
}

// Chamado no main.ts e no SetupTestApp (antes do app.init / listen)
export function configureCors(app: INestApplication) {
	const cors = buildCorsOptions();
	app.enableCors(cors);
	app.useWebSocketAdapter(new CorsIoAdapter(app, cors));
}
