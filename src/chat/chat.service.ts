import { Types } from 'mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import { RedisService } from '../redis/redis.service';

export interface ChatConnection {
	socketId: string;
	userId: string;
	conversationId: string;
}

export interface RemoveChatConnection {
	socketId: string;
	conversationId: string;
}

@Injectable()
export class ChatService {
	constructor(
		private readonly conversationService: ConversationService,
		private readonly redisService: RedisService,
	) {}

	async enterTheConversation(myProfileId: Types.ObjectId, targetUserId: Types.ObjectId) {
		const conversation = await this.conversationService.findBetweenUsers(myProfileId, targetUserId);

		if (!conversation) {
			return { userAllowed: false };
		}

		return { userAllowed: true, conversationId: conversation.id };
	}

	async createRoom(conversationId: Types.ObjectId) {
		const conversation = await this.conversationService.findById(conversationId);

		if (!conversation) throw new NotFoundException('Conversation not found');

		return { created: true, conversationId };
	}

	async testRedisConnection(): Promise<string> {
		try {
			await this.redisService.setKey('test:key', 'Hello from Redis!');
			const value = await this.redisService.getKey('test:key');
			return `Redis says: ${value}`;
		} catch (error) {
			console.error('Redis connection error:', error);
			return 'Failed to connect to Redis';
		}
	}

	async addConnection({ socketId, userId, conversationId }: ChatConnection) {
		const connKey = `connection:${socketId}`;
		const convKey = `conversation:${conversationId}`;

		await this.redisService.setKey(connKey, JSON.stringify({ socketId, userId, conversationId }));
		await this.redisService.addToSet(convKey, socketId);
	}

	async removeConnection({ socketId, conversationId }: RemoveChatConnection) {
		const connKey = `connection:${socketId}`;
		const convKey = `conversation:${conversationId}`;

		await this.redisService.deleteKey(connKey);
		await this.redisService.removeFromSet(convKey, socketId);

		const remainingSockets = await this.redisService.countSetMembers(convKey);
		if (remainingSockets === 0) {
			await this.redisService.deleteKey(convKey);
		}
	}
}
