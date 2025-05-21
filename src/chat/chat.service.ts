import { Injectable } from '@nestjs/common';

interface ConnectionInfo {
	socketId: string;
	userId: string;
	conversationId: string;
}

@Injectable()
export class ChatService {
	/**
	 * In-memory storage of all active connections.
	 * Maps socketId to connection info (user and conversation).
	 */
	private connections = new Map<string, ConnectionInfo>();

	/**
	 * Maps conversationId to the set of socketIds participating in it.
	 * Enables broadcasting messages to all sockets in a conversation.
	 */
	private conversationSockets = new Map<string, Set<string>>();

	/**
	 * Registers a new socket connection.
	 * - Stores the socketId with associated user and conversation.
	 * - Ensures the conversation has a Set to hold its sockets.
	 * - Adds the socketId to the appropriate conversation.
	 */
	addConnection(socketId: string, userId: string, conversationId: string) {
		this.connections.set(socketId, { socketId, userId, conversationId });

		if (!this.conversationSockets.has(conversationId)) {
			this.conversationSockets.set(conversationId, new Set());
		}
		this.conversationSockets.get(conversationId)!.add(socketId);
	}

	/**
	 * Removes a socket connection.
	 * - Deletes the connection from the global connections map.
	 * - Removes the socketId from the corresponding conversation.
	 * - If no sockets remain in the conversation, deletes the entry.
	 */
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

	/**
	 * Returns all active socketIds associated with a given conversation.
	 * If none are found, returns an empty array.
	 */
	getSocketsByConversation(conversationId: string): string[] {
		return Array.from(this.conversationSockets.get(conversationId) ?? []);
	}

	/**
	 * Returns all active socketIds associated with a given userId.
	 * Filters the global connections to match the user.
	 */
	getSocketsByUser(userId: string): string[] {
		return Array.from(this.connections.values())
			.filter(conn => conn.userId === userId)
			.map(conn => conn.socketId);
	}
}
