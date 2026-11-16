import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const RedisProvider: Provider = {
	provide: 'REDIS_CLIENT',
	useFactory: () => {
		return new Redis({
			host: process.env.REDIS_HOST || 'localhost',
			port: Number(process.env.REDIS_PORT) || 6379,
			password: process.env.REDIS_PASSWORD || undefined,
			// IPv4 e IPv6: a rede privada do Railway (*.railway.internal) é só IPv6
			family: 0,
		});
	},
};
