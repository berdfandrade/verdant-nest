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

@WebSocketGateway({
	cors: { origin: '*' },
})
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
			
			/*
				- Tenho que usar a mesma interface do sendMessage aqui
				- que no frontend, aí da pra controlar a maniupulação dos dois lados
				
				- Quando eu pego a mensagem aqui, devo salvar a mensagem 
				- Devo transmitir o typing com o socket...
			*/

			this.server.emit('received_message', data);
			this.logger.log(`${JSON.stringify(data)}`);
		} catch (error) {
			this.logger.error('Erro ao enviar mensagem', error);
			client.emit('error', { message: 'Error ao enviar mensagem', content: data.content });
		}
	}
}
