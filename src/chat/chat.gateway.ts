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
import { MessagesService } from '@/messages/messages.service';

/*
	Fluxo do cliente:
	1. Conecta com `io(url, { auth: { token } })`  (token = access_token do /login)
	2. emit('join_conversation', { conversationId })
	3. emit('send_message', { conversationId, content })
	4. Escuta 'new_message' (todos da conversa) e 'notification' (quando não está na sala)
	5. emit('typing', { conversationId, isTyping }) -> os outros recebem 'typing'
	6. emit('mark_read', { conversationId }) ao abrir a conversa ou receber mensagem
	   -> o remetente recebe 'messages_read' (confirmação de leitura)

	`typing` e `mark_read` exigem ter entrado na sala (join_conversation já checa
	se o usuário participa), o que evita ir ao banco a cada tecla digitada.
*/

export interface ConversationPayload {
	conversationId: string;
}

export interface SendMessagePayload extends ConversationPayload {
	content: string;
}

export interface TypingPayload extends ConversationPayload {
	isTyping: boolean;
}

export const userRoom = (userId: string) => `user:${userId}`;
export const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;

// CORS: definido por CORS_ORIGINS via CorsIoAdapter (src/config/cors.config.ts)
@WebSocketGateway()
export class ChatGateway implements GatewayConfig {
	constructor(
		private readonly chatService: ChatService,
		private readonly conversationService: ConversationService,
		private readonly authService: AuthService,
		private readonly messagesService: MessagesService,
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

	// Só quem entrou na sala da conversa pode emitir eventos dela
	private isInConversation(client: Socket, conversationId: string, errorEvent: string) {
		if (!this.isValidConversation(client, conversationId, errorEvent)) return false;
		if (!client.rooms?.has(conversationRoom(conversationId))) {
			client.emit(errorEvent, { message: 'Join the conversation first' });
			return false;
		}
		return true;
	}

	@SubscribeMessage('typing')
	handleTyping(@MessageBody() data: TypingPayload, @ConnectedSocket() client: Socket) {
		if (!this.isInConversation(client, data?.conversationId, 'typing_error')) return;

		// Para os outros da sala (não volta para quem está digitando)
		client.to(conversationRoom(data.conversationId)).emit('typing', {
			conversationId: data.conversationId,
			userId: client.data.userId,
			isTyping: !!data.isTyping,
		});
	}

	@SubscribeMessage('mark_read')
	async handleMarkRead(@MessageBody() data: ConversationPayload, @ConnectedSocket() client: Socket) {
		if (!this.isInConversation(client, data?.conversationId, 'mark_read_error')) return;

		try {
			const result = await this.messagesService.markConversationRead(data.conversationId, client.data.userId);

			// Só avisa o remetente se alguma mensagem mudou de estado
			if (result.count > 0) {
				this.server.to(conversationRoom(data.conversationId)).emit('messages_read', {
					conversationId: data.conversationId,
					userId: client.data.userId,
					readAt: result.readAt,
				});
			}

			client.emit('marked_read', { conversationId: data.conversationId, count: result.count });
		} catch (error) {
			this.logger.error('Error on mark_read', error);
			client.emit('mark_read_error', { message: 'Error marking messages as read' });
		}
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

			if (!(await this.chatService.allowMessage(sender))) {
				client.emit('send_message_error', { message: 'Too many messages, slow down' });
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
