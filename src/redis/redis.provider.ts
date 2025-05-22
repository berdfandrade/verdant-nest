import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

const RedisConfig = {
	host: process.env.REDIS_HOST || 'localhost',
	port: Number(process.env.REDIS_PORT) || 6379,
	password: process.env.REDIS_PASSWORD || '',
};

export const RedisProvider: Provider = {
	provide: 'REDIS_CLIENT',
	useFactory: () => {
		return new Redis(RedisConfig);
	},
};
