import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayInit,
	OnGatewayConnection,
	OnGatewayDisconnect,
	MessageBody,
	ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface SendMessagePayload {
	conversationId: string;
	sender: string;
	text: string;
}

@WebSocketGateway({
	cors: {
		origin: '*', // configure conforme necessário
	},
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	private logger = new Logger('ChatGateway');

	@WebSocketServer()
	server: Server;

	afterInit(server: Server) {
		this.logger.log('WebSocket Server iniciado');
	}

	handleConnection(client: Socket) {
		this.logger.log(`Cliente conectado: ${client.id}`);
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Cliente desconectado: ${client.id}`);
	}

	@SubscribeMessage('join_conversation')
	handleJoinConversation(
		@MessageBody() data: { conversationId: string },
		@ConnectedSocket() client: Socket,
	) {
		client.join(data.conversationId);
		this.logger.log(`Cliente ${client.id} entrou na conversa ${data.conversationId}`);
		client.emit('joined_conversation', { conversationId: data.conversationId });
	}

	@SubscribeMessage('send_message')
	handleSendMessage(@MessageBody() data: SendMessagePayload, @ConnectedSocket() client: Socket) {
		if (!data || !data.conversationId || !data.sender || !data.text) {
			this.logger.warn(
				`Payload inválido recebido de ${client.id}: ${JSON.stringify(data)}`,
			);
			return;
		}

		const { conversationId, sender, text } = data;
		this.logger.log(`Mensagem de ${sender} na conversa ${conversationId}: ${text}`);

		this.server.to(conversationId).emit('receive_message', {
			sender,
			text,
			conversationId,
			timestamp: new Date().toISOString(),
		});
	}
}
