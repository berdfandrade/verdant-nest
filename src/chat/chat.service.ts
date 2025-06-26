import { Types, Model } from 'mongoose';
import { ForbiddenException, Injectable, NotFoundException, Type } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import { RedisService } from '../redis/redis.service';
import { Message, MessageDocument } from '../messages/message.schema';
import { MessagesService } from '../messages/messages.service';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

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
}

export interface SendMessage {
	sender: Types.ObjectId;
	conversationId: Types.ObjectId;
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

		const isParticipant = conversation.participants.some(p => p.equals(sender));
		if (!isParticipant) throw new ForbiddenException('User not in conversation');

		const newMessage = { sender, conversationId, content, sentAt: new Date() };
		await this.messageService.create(newMessage);

		return { delivered: true, sentAt: newMessage.sentAt };
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
	 * @deprecated Use `newFunction()` instead.
	*/
	async createRoom(conversationId: Types.ObjectId) {
		const conversation = await this.conversationService.findById(conversationId);

		if (!conversation) throw new NotFoundException('Conversation not found');

		return { created: true, conversationId };
	}



	async userIsAllowed(myProfileId: Types.ObjectId, conversationId: Types.ObjectId) {
		try {
			const conversation = await this.conversationService.findById(conversationId);
			if (!conversation) throw new NotFoundException('Conversation not found');
			const isParticipant = conversation.participants.some(p => p.equals(myProfileId));
			if (!isParticipant) throw new NotFoundException('User not in this conversation');
			return true;
		} catch (error) {
			console.error('Error on autheticate user', error);
		}
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
