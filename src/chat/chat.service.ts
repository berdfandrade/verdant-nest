import { Types } from 'mongoose';
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import Redis from 'ioredis';

export interface ChatConnection {
	socketId, userId, conversationId : string
}

export interface RemoveChatConnection {
	socketId, conversationId : string
}

@Injectable()
export class ChatService {
	constructor(
		@Inject('REDIS_CLIENT')
		private readonly redis: Redis,
		private readonly conversationService: ConversationService,
	) {}

	async enterTheConversation(myProfileId: Types.ObjectId, targetUserId: Types.ObjectId) {
		const conversation = await this.conversationService.findBetweenUsers(
			myProfileId,
			targetUserId,
		);

		if (!conversation) {
			return { userAllowed: false };
		}

		return { userAllowed: true, conversationId: conversation.id };
	}

	async createRoom(conversationId: Types.ObjectId) {
		// Verifica se a conversa realmente existe no banco
		const conversation = await this.conversationService.findById(conversationId);

		if (!conversation) throw new NotFoundException('Conversation not found');

		return { created: true, conversationId };
	}

	async testRedisConnection(): Promise<string> {
		try {
			// Escreve um valor no Redis
			await this.redis.set('test:key', 'Hello from Redis!');

			// Lê o valor de volta
			const value = await this.redis.get('test:key');

			return `Redis says: ${value}`;
		} catch (error) {
			console.error('Redis connection error:', error);
			return 'Failed to connect to Redis';
		}
	}

	async addConnection({socketId, userId, conversationId} : ChatConnection) {

		// Armazena os dados da conexão JSON
		const connKey = `connection:${socketId}`

		// É um set com todos os socketsIds conectados àquela conversa
		const convKey = `conversation:${conversationId}`

		await this.redis.set(connKey, JSON.stringify({ socketId, userId, conversationId }))
		await this.redis.sadd(convKey, socketId)
	}
	
	async removeConnection({socketId, conversationId} : RemoveChatConnection) {
		
		const connKey = `connection:${socketId}`
		const convKey = `conversation:${conversationId}`

		// Remove os dados da conexão indidual
		await this.redis.del(connKey)

		// Remove o socketId do conjunto da conversa
		await this.redis.srem(convKey, socketId)

		// (Opcional) Verifica se o set está vazio e deleta 
		// a chave do set se necessário
		const remainingSockets = await this.redis.scard(connKey)
		if(remainingSockets === 0) { await this.redis.del(connKey) }
	}	
}
