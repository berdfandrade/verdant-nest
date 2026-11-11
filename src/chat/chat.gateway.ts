import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { GatewayConfig } from './config/webSocketGateway.config';

import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
} from '@nestjs/websockets';

import { ConversationService } from '@/conversation/conversation.service';
import { Types } from 'mongoose';
import { AuthService } from '@/auth/auth.service';

/*
	Fluxo do cliente:
	1. Conecta com `io(url, { auth: { token } })`  (token = access_token do /login)
	2. emit('join_conversation', { conversationId })
	3. emit('send_message', { conversationId, content })
	4. Escuta 'new_message' (todos da conversa) e 'notification' (quando não está na sala)
*/

export interface ConversationPayload {
	conversationId: string;
}

export interface SendMessagePayload extends ConversationPayload {
	content: string;
}

export const userRoom = (userId: string) => `user:${userId}`;
export const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;

@WebSocketGateway({
	cors: { origin: '*' },
})
export class ChatGateway implements GatewayConfig {
	constructor(
		private readonly chatService: ChatService,
		private readonly conversationService: ConversationService,
		private readonly authService: AuthService,
	) {}

	private logger = new Logger('ChatGateway');

	@WebSocketServer()
	server: Server;

	afterInit(server: Server) {
		this.logger.log('WebSocket Server iniciado');
	}

	async handleConnection(client: Socket) {
		try {
			const token =
				client.handshake.auth?.token ??
				client.handshake.headers?.authorization?.replace('Bearer ', '');

			// O userId vem do token, nunca do cliente
			const payload = await this.authService.verifyToken(token);
			const userId = payload.sub;

			client.data.userId = userId;
			await client.join(userRoom(userId));
			await this.chatService.setOnline(userId, client.id);

			this.logger.log(`User id ${userId}, in socket (${client.id})`);
		} catch (error) {
			client.emit('auth_error', 'No token or invalid token');
			client.disconnect();
		}
	}

	async handleDisconnect(client: Socket) {
		this.logger.log(`🔌 Desconectando ${client.id}`);
		try {
			await this.chatService.setOffline(client.id);
		} catch (error) {
			this.logger.error('Error on disconnect', error);
		}
	}

	private isValidConversation(client: Socket, conversationId: string, errorEvent: string) {
		if (!Types.ObjectId.isValid(conversationId)) {
			client.emit(errorEvent, { message: 'Invalid ConversationId' });
			return false;
		}
		return true;
	}

	@SubscribeMessage('join_conversation')
	async handleJoinConversation(
		@MessageBody() data: ConversationPayload,
		@ConnectedSocket() client: Socket,
	) {
		const userId = client.data.userId;
		if (!this.isValidConversation(client, data?.conversationId, 'join_conversation_error')) return;

		const isUserAllowed = await this.chatService.userIsAllowed(userId, data.conversationId);
		if (!isUserAllowed) {
			client.emit('join_conversation_error', { message: 'User not allowed' });
			return;
		}

		await client.join(conversationRoom(data.conversationId));
		await this.chatService.addConnection({
			socketId: client.id,
			userId,
			conversationId: data.conversationId,
		});

		client.emit('joined_conversation', { conversationId: data.conversationId });
	}

	@SubscribeMessage('leave_conversation')
	async handleLeaveConversation(
		@MessageBody() data: ConversationPayload,
		@ConnectedSocket() client: Socket,
	) {
		if (!this.isValidConversation(client, data?.conversationId, 'leave_conversation_error')) return;

		await client.leave(conversationRoom(data.conversationId));
		await this.chatService.removeConnection({
			socketId: client.id,
			conversationId: data.conversationId,
		});

		client.emit('left_conversation', { conversationId: data.conversationId });
	}

	@SubscribeMessage('view_messages')
	async handleViewMessages(@MessageBody() data, @ConnectedSocket() client: Socket) {
		try {
			await this.conversationService.findForParticipant(data?.conversationId, client.data.userId);

			const messageHistory = await this.conversationService.getMessages(
				data.conversationId,
				data.limit ?? 50,
				data.skip ?? 0,
			);

			client.emit('view_messages', { messageHistory });
		} catch (error) {
			this.logger.log(`Error on search messages ${JSON.stringify(error.message)}`);
			client.emit('view_messages_error', { message: error.message });
		}
	}

	@SubscribeMessage('send_message')
	async handleSendMessage(@MessageBody() data: SendMessagePayload, @ConnectedSocket() client: Socket) {
		const sender = client.data.userId;

		try {
			if (!this.isValidConversation(client, data?.conversationId, 'send_message_error')) return;

			if (typeof data.content !== 'string' || !data.content.trim()) {
				client.emit('send_message_error', { message: 'Message content is required' });
				return;
			}

			const isUserAllowed = await this.chatService.userIsAllowed(sender, data.conversationId);

			if (!isUserAllowed) {
				client.emit('send_message_error', { message: 'User not allowed' });
				return;
			}

			const { message, conversation } = await this.chatService.sendMessage({
				sender,
				conversationId: data.conversationId,
				content: data.content,
			});

			// Entrega para quem está com a conversa aberta
			this.server.to(conversationRoom(data.conversationId)).emit('new_message', message);

			// Notifica o outro participante (em qualquer tela do app)
			const receivers = (conversation?.participants ?? [])
				.map(p => p.toString())
				.filter(id => id !== sender);

			for (const receiverId of receivers) {
				this.server.to(userRoom(receiverId)).emit('notification', {
					type: 'new_message',
					conversationId: data.conversationId,
					message,
				});
			}

			client.emit('received_message', message);
		} catch (error) {
			this.logger.error('Erro ao enviar mensagem', error);
			client.emit('send_message_error', { message: 'Error ao enviar mensagem', content: data?.content });
		}
	}
}
