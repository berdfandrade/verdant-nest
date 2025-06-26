import { Logger, NotFoundException, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessage } from './chat.service';
import { GatewayConfig } from './config/webSocketGateway.config';

import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
} from '@nestjs/websockets';

import { ConversationService } from 'src/conversation/conversation.service';
import { MessagesService } from 'src/messages/messages.service';
import { Types } from 'mongoose';
import { User } from 'src/auth/decorators/user.decorator';
import { AuthService } from 'src/auth/auth.service';
import { RedisService } from 'src/redis/redis.service';

@WebSocketGateway({
	cors: { origin: '*' },
})
export class ChatGateway implements GatewayConfig {
	constructor(
		private readonly chatService: ChatService,
		private readonly conversationService: ConversationService,
		private readonly messageService: MessagesService,
		private readonly redisService: RedisService,
		private readonly authService: AuthService,
	) {}

	private logger = new Logger('ChatGateway');
	private connectedUsers = new Map<string, string>();

	@WebSocketServer()
	server: Server;

	afterInit(server: Server) {
		this.logger.log('WebSocket Server iniciado');
	}

	async handleConnection(client: Socket) {
		try {
			const userId = client.handshake.auth?.userId;
			const token = await this.authService.verifyToken(client.handshake.auth?.token);

			if (!token || !userId) {
				client.emit('auth_error', 'No token or invalid token');
				client.disconnect();
				return;
			}

			await this.redisService.setKey(`online:${userId}`, client.id);
			// this.redisService.setKey(userId, client.id);
			this.logger.log(`User id ${userId}, in socket (${client.id})`);
		} catch (error) {
			this.logger.log(`Erro on stablish connection`, error);
		}
	}

	async handleDisconnect(client: Socket) {
		this.logger.log(`🔌 Desconectando ${client.id}`);

		// Recupera todos os online para achar o user
		// const pattern = 'online:*';
		// const keys = await this.redisService.getKeys(pattern);

		// for (const key of keys) {
		// 	const socketId = await this.redisService.getValue(key);
		// 	if (socketId === client.id) {
		// 		await this.redisService.deleteKey(key);
		// 		this.logger.log(`❌ Usuário ${key.replace('online:', '')} removido de online`);
		// 		break;
		// 	}
		// }
	}

	@SubscribeMessage('view_messages')
	async handleViewMessages(@MessageBody() data, @ConnectedSocket() client: Socket) {
		try {
			const messageHistory = await this.conversationService.getMessages(
				data.conversationId,
			);

			client.emit('view_messages', { messageHistory });
		} catch (error) {
			this.logger.log(`Error on search messages ${JSON.stringify(error.message)}`);
			client.emit('view_messages_error', { message: error.message });
		}
	}

	@SubscribeMessage('send_message')
	async handleSendMessage(@MessageBody() data: SendMessage, @ConnectedSocket() client: Socket) {
		try {
			if (!Types.ObjectId.isValid(data.sender)) {
				client.emit('join_conversation_error', { message: 'Invalid userId' });
				return;
			}

			if (!Types.ObjectId.isValid(data.conversationId)) {
				client.emit('join_conversation_error', { message: 'Invalid ConversationId' });
				return;
			}

			const isUserAllowed = await this.chatService.userIsAllowed(
				data.sender,
				data.conversationId,
			);

			if (!isUserAllowed) {
				client.emit('join_conversation_error', { message: 'User not allowed' });
				return;
			}

			await this.chatService.sendMessage(data);

			client.emit('received_message', data.content);
			this.logger.log(`${JSON.stringify(data.content)}`);
		} catch (error) {
			this.logger.error('Erro ao enviar mensagem', error);
			client.emit('error', { message: 'Error ao enviar mensagem', content: data.content });
		}
	}
}
