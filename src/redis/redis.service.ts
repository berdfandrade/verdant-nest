import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy{
	constructor(
		@Inject('REDIS_CLIENT')
		private readonly redis: Redis,
	) {}

	async setKey(key: string, value: any, expireInSeconds?: number): Promise<void> {
		const stringValue = JSON.stringify(value);
		if (expireInSeconds) {
			await this.redis.set(key, stringValue, 'EX', expireInSeconds);
		} else {
			await this.redis.set(key, stringValue);
		}
	}

	async getKey<T = any>(key: string): Promise<T | null> {
		const value = await this.redis.get(key);
		return value ? JSON.parse(value) : null;
	}

	async deleteKey(key: string): Promise<number> {
		return this.redis.del(key);
	}

	async addToSet(key: string, value: string): Promise<number> {
		return this.redis.sadd(key, value);
	}

	async removeFromSet(key: string, value: string): Promise<number> {
		return this.redis.srem(key, value);
	}

	async countSetMembers(key: string): Promise<number> {
		return this.redis.scard(key);
	}

	async isMemberOfSet(key: string, value: string): Promise<boolean> {
		const result = await this.redis.sismember(key, value);
		return result === 1;
	}

	async getSetMembers(key: string): Promise<string[]> {
		return this.redis.smembers(key);
	}

    async onModuleDestroy() {
        await this.redis.quit();
    }
}
