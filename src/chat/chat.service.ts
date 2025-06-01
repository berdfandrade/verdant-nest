import { Types, Model } from 'mongoose';
import { ForbiddenException, Injectable, NotFoundException, Type } from '@nestjs/common';
import { ConversationService } from '../conversation/conversation.service';
import { RedisService } from '../redis/redis.service';
import { Message, MessageDocument } from '../messages/message.schema';
import { MessagesService } from '../messages/messages.service';

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
	myProfileId;
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
	sentAt: Date;
}

@Injectable()
export class ChatService {
	constructor(
		private readonly conversationService: ConversationService,
		private readonly messageService: MessagesService,
		private readonly redisService: RedisService,
	) {}

	/*
		Mandar mensagem naquela conversa específica:
			- Primeiro precisa ter a conversa que vai ser mandanda a mensagem (conversationId)
			- Precisamos achar a conversa e garantir que o usuário pode mandar mensagem naquela conversa
			- Depois que garantimos que aquela conversa existe e que o usuário pode mandar mensagem naquela conversa
			- Criamos um socket para aquela conversa.
			- Depois que o socket foi criado (sala), o usuário poderá mandar mensagens naquela conversa
			- A mensagem é 
	*/

	// ? Calma aí que agora eu vou ter que criar um controller de messages
	async sendMessage({
		sender,
		conversationId,
		content,
		sentAt,
	}: SendMessage): Promise<MessageResponse> {
		// 1. Verifica se a conversa existe
		const conversation = await this.conversationService.findById(conversationId);

		// 2. Caso a conversa não exista
		if (!conversation) throw new NotFoundException('Conversation not found');

		// 3. Verifica se o usuário é participante
		const isParticipant = conversation.participants.some(p => p.equals(sender));

		// 4. Caso sender não esteja na conversa
		if (!isParticipant) throw new ForbiddenException('User not in conversation');

		// 5. Cria a mensagem
		const newMessage = { sender, conversationId, content, sentAt: new Date() };

		// 6. Ao invés de salvar diretamente no conversations...
		await this.messageService.create(newMessage);

		// Retorna o objeto dizendo que a mensagem foi entregue
		return { delivered: true, sentAt: newMessage.sentAt };
	}

	async enterTheConversation({ myProfileId, targetUserId }: EnterTheConversation) {
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

		await this.redisService.setKey(
			connKey,
			JSON.stringify({ socketId, userId, conversationId }),
		);
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
