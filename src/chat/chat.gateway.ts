import { Logger, NotFoundException, UseGuards } from '@nestjs/common';
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
import { ConversationService } from 'src/conversation/conversation.service';
import { MessagesService } from 'src/messages/messages.service';
import { Types } from 'mongoose';

@WebSocketGateway({
	cors: { origin: '*' },
})
export class ChatGateway implements GatewayConfig {
	constructor(
		private readonly chatService: ChatService,
		private readonly conversationService: ConversationService,
		private readonly messageService: MessagesService,
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

	/*
		TODO : EU PRECISO GARANTIR QUE O USUÁRIO NÃO ENTRE NA DETERMINADA CONVERSA,
		TODO : TESTES DEVEM SER FEITOS COM O POSTMAN -- INSOMNIA NÃO POSSUI SUPORTE PARA TESTES COM O SOCKET.IO.
			- Preciso ver se o UserId que tá mandando aquela solicitação pode entrar na conversa
			- Daí ele entra na conversa com o "join_conversation"
			- Quando ele entrar na conversa, ele pode mandar mensagem.
			- ver o resto da lógica de ver como a conversa está, depois...
	*/

	@SubscribeMessage('join_conversation')
	async handleJoinConversation(
		@MessageBody() data: { conversationId: string },
		@ConnectedSocket() client: Socket,
	) {
		const conversationId = new Types.ObjectId(data.conversationId);
		const conversationExists = await this.conversationService.findById(conversationId);

		if (!conversationExists) {
			this.logger.log(`A conversa ${conversationId} NÃO EXISTE`);
			client.emit('error', { message: 'Conversation does not exist' });
			return; // evita que continue executando
		}

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

				- Esse sendmessage é como se fosse um acordo entre os dois....
			*/

			this.server.emit('received_message', data);
			this.logger.log(`${JSON.stringify(data)}`);
		} catch (error) {
			this.logger.error('Erro ao enviar mensagem', error);
			client.emit('error', { message: 'Error ao enviar mensagem', content: data.content });
		}
	}
}
