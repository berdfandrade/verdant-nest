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
import { ChatService } from './chat.service';
import { SendMessage } from './chat.service';

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})

export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	constructor(
		private readonly chatService: ChatService,
	) {}

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
	async handleSendMessage(@MessageBody() data: SendMessage, @ConnectedSocket() client: Socket) {
		
		// Para salvar a mensagem
		const savedMessage = await this.chatService.sendMessage(data);

		// Log apenas
		this.logger.log(`USER_ID : ${data.sender}: ${JSON.stringify(data)}`);

		// Mandar a mensagem para o socket
		// this.server.emit('received_message', savedMessage);
	}
}
