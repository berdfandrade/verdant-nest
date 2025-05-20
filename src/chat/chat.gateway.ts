import {
	WebSocketGateway,
	SubscribeMessage,
	OnGatewayInit,
	OnGatewayDisconnect,
	MessageBody,
	ConnectedSocket,
	OnGatewayConnection } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})

export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	private Logger: Logger = new Logger('ChatGateway');

	afterInit(server: Server) {
		this.Logger.log('WebSocket init');
	}

	handleConnection(client: Socket) {
		this.Logger.log(`Client connected: ${client.id}`);
	}

	handleDisconnect(client: Socket) {
		this.Logger.log(`Client disconnected : ${client.id}`);
	}

    // Data é aquilo que vem do client... 
	@SubscribeMessage('send_message')
	handleMessage(
		@MessageBody() data: { conversationId: string; message: string, userId : string },
		@ConnectedSocket() client: Socket,
	) {	
		// 
        this.Logger.log(`Mensagem de ${data.userId}`)
		client.broadcast.emit('receive_message', data);
		return { status: 'ok', ...data };
	}

	@SubscribeMessage('join_conversation')
	handleJoinConversation(
		@MessageBody() data : {conversationId : string},
		@ConnectedSocket() client : Socket
	) {
		client.join(data.conversationId);
		this.Logger.log(`Client ${client.id} joined room ${data.conversationId}`)
	}
}
