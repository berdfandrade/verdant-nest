import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {

	async createMessage(data: { conversationId: string; content: string }) {
        // Aqui você vai integar o ConversdationService depois
        return {
            ...data, sentAt : new Date()
        }
    }

    
}
