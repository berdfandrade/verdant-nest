import { Injectable } from '@nestjs/common';

interface ConnectionInfo {
	socketId: string;
	userId: string;
	conversationId: string;
}

@Injectable()
export class ChatService {

    
	// Map para guardar as conexões ativas: socketId => ConnectionInfo
	private connections = new Map<string, ConnectionInfo>();

	// Guardar lista de sockets por conversationId para broadcast
	private conversationSockets = new Map<string, Set<string>>();

	// Registrar uma conexão
	addConnection(socketId: string, userId: string, conversationId: string) {
		this.connections.set(socketId, { socketId, userId, conversationId });

		if (!this.conversationSockets.has(conversationId)) {
			this.conversationSockets.set(conversationId, new Set());
		}
		this.conversationSockets.get(conversationId)!.add(socketId);
	}

	// Remover conexão
	removeConnection(socketId: string) {
		const connection = this.connections.get(socketId);
		if (!connection) return;

		this.connections.delete(socketId);

		const sockets = this.conversationSockets.get(connection.conversationId);
		if (sockets) {
			sockets.delete(socketId);
			if (sockets.size === 0) {
				this.conversationSockets.delete(connection.conversationId);
			}
		}
	}

	// Buscar sockets ativos para uma conversationId
	getSocketsByConversation(conversationId: string): string[] {
		return Array.from(this.conversationSockets.get(conversationId) ?? []);
	}

	// Buscar conexões de um usuário (se precisar)
	getSocketsByUser(userId: string): string[] {
		return Array.from(this.connections.values())
			.filter(conn => conn.userId === userId)
			.map(conn => conn.socketId);
	}
}
