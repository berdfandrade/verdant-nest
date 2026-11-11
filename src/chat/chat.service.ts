import { Types } from 'mongoose';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationService } from '@/conversation/conversation.service';
import { RedisService } from '@/redis/redis.service';
import { Message } from '@/messages/message.schema';
import { Conversation } from '@/conversation/schemas/conversation.schema';
import { MessagesService } from '@/messages/messages.service';
import MongoDbUtils from '@/utils/MongoDB.utils';
import { RATE_LIMITS, RateLimitConfig } from '@/config/rate-limit.config';

export interface ChatConnection {
	socketId: string;
	userId: string;
	conversationId: string;
}

export interface RemoveChatConnection {
	socketId: string;
	conversationId: string;
}

export interface EnterTheConversation {
	myProfileId: Types.ObjectId;
	targetUserId: Types.ObjectId;
}

export interface MessageResponse {
	delivered: boolean;
	sentAt: Date;
	message?: Message;
	conversation?: Conversation;
}

export interface SendMessage {
	sender: Types.ObjectId | string;
	conversationId: Types.ObjectId | string;
	content: string;
}

@Injectable()
export class ChatService {
	constructor(
		private readonly conversationService: ConversationService,
		private readonly messageService: MessagesService,
		private readonly redisService: RedisService,
	) {}

	async sendMessage({ sender, conversationId, content }: SendMessage): Promise<MessageResponse> {
		const conversation = await this.conversationService.findById(conversationId);
		if (!conversation) throw new NotFoundException('Conversation not found');

		const isParticipant = this.conversationService.isParticipant(conversation, sender);
		if (!isParticipant) throw new ForbiddenException('User not in conversation');

		const newMessage = {
			sender: MongoDbUtils.toObjectId(sender),
			conversationId: MongoDbUtils.toObjectId(conversationId),
			content,
			sentAt: new Date(),
		};
		const message = await this.messageService.create(newMessage);

		return { delivered: true, sentAt: newMessage.sentAt, message, conversation };
	}

	async chatHistory(conversationId: Types.ObjectId) {
		// Primeiro buscamos a mensagem
		const conversation = await this.conversationService.findById(conversationId);

		// Caso a conversa não exista
		if (!conversation) throw new NotFoundException('Conversation not found');

		// Popular as mensagens
		await conversation.populate({
			path: 'messages',
			options: { sort: { createdAt: 1 } },
			populate: { path: 'sender' },
		});

		// Retorna as mensagens da conversa
		return conversation.messages;
	}

	/**
	 * @deprecated As salas agora são as próprias conversas (evento `join_conversation` no gateway).
	*/
	async createRoom(conversationId: Types.ObjectId) {
		const conversation = await this.conversationService.findById(conversationId);

		if (!conversation) throw new NotFoundException('Conversation not found');

		return { created: true, conversationId };
	}



	async userIsAllowed(
		myProfileId: Types.ObjectId | string,
		conversationId: Types.ObjectId | string,
	): Promise<boolean> {
		try {
			const conversation = await this.conversationService.findById(conversationId);
			return conversation.isActive && this.conversationService.isParticipant(conversation, myProfileId);
		} catch {
			return false;
		}
	}

	// Limite de mensagens pelo socket, por usuário (contador no Redis, vale entre instâncias)
	async allowMessage(userId: string): Promise<boolean> {
		if (!RateLimitConfig.enabled) return true;
		const { limit, windowSeconds } = RATE_LIMITS.socketMessages;
		const count = await this.redisService.increment(`ratelimit:ws:send:${userId}`, windowSeconds);
		return count <= limit;
	}

	// ---- Presença (online/offline) ----

	async setOnline(userId: string, socketId: string) {
		await this.redisService.setKey(`online:${userId}`, socketId);
		await this.redisService.setKey(`socket:${socketId}`, userId);
	}

	async setOffline(socketId: string): Promise<string | null> {
		const userId = await this.redisService.getKey<string>(`socket:${socketId}`);
		await this.redisService.deleteKey(`socket:${socketId}`);

		if (userId) {
			// Só remove o online se ainda for o mesmo socket (o user pode ter reconectado)
			const currentSocket = await this.redisService.getKey<string>(`online:${userId}`);
			if (currentSocket === socketId) await this.redisService.deleteKey(`online:${userId}`);
		}

		return userId;
	}

	async isOnline(userId: string): Promise<boolean> {
		return (await this.redisService.getKey(`online:${userId}`)) !== null;
	}

	async addConnection({ socketId, userId, conversationId }: ChatConnection) {
		const connKey = `connection:${socketId}`;
		const convKey = `conversation:${conversationId}`;

		await this.redisService.setKey(
			connKey,
			JSON.stringify({ socketId, userId, conversationId }),
		);
		await this.redisService.addToSet(convKey, socketId);
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
