import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessage } from './chat.service';
import { GatewayConfig, GatewayCors } from './config/webSocketGateway.config';
import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
} from '@nestjs/websockets';


@WebSocketGateway(GatewayCors)
export class ChatGateway implements GatewayConfig {
	constructor(private readonly chatService: ChatService) {}

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
		try {
			const savedMessage = await this.chatService.sendMessage(data);
			this.logger.log(`USER_ID : ${data.sender}: ${JSON.stringify(data)}`);
			const conversationId = data.conversationId.toHexString();
			this.server.to(conversationId).emit('received_message', savedMessage);
		} catch (error) {
			this.logger.error('Erro ao enviar mensagem', error);
			client.emit('error', { message: 'Error ao enviar mensagem', content: data.content });
		}
	}
}
