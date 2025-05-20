import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, ObjectId, Types } from 'mongoose';
import { Message } from './schemas/message.schema';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import MongoDbUtils from '../utils/MongoDB.utils';

@Injectable()
export class ConversationService {
	constructor(
		@InjectModel(Conversation.name)
		private conversationModel: Model<ConversationDocument>,
	) {}

	// Cria uma nova conversa
	async create(createDto: CreateConversationDto): Promise<Conversation> {
		// Se quiser, valida que tenha 2 participantes
		if (createDto.participants.length !== 2) {
			throw new Error('Conversation must have exactly 2 participants.');
		}

		const newConversation = new this.conversationModel(createDto);
		return newConversation.save();
	}

	// Busca uma convera pelo _id
	async findById(id: string | Types.ObjectId): Promise<Conversation> {
		const objId = MongoDbUtils.toObjectId(id)
		const conversation = await this.conversationModel.findById(objId).exec();
		if (!conversation) throw new NotFoundException(`Conversation not found with ID ${id}`);
		return conversation;
	}

	// Busca conversa entre dois usuários (independente da ordem)
	async findBetweenUsers(id1: any, id2: any): Promise<Conversation | null> {
    
		return this.conversationModel
			.findOne({
				participants: { $all: [id1, id2] },
				isActive: true,
			})
			.exec();
	}

	// Adiciona uma mensagem a uma conversa (push no array de mensagem)
	async addMessage(conversationId: any, message: Message): Promise<Conversation> {
		const conversation = await this.conversationModel.findById(conversationId);
		if (!conversation) throw new NotFoundException('Conversation not found');

		conversation.messages.push(message);

		// Atualiza o campo lasMessageAt (se implementado)
		// Conversation.lastMessageAt = message.sentAt;

		return conversation.save();
	}

	// Busca mensagens de uma conversa (pode ser paginado)
	async getMessages(conversationId: any , limit = 50, skip = 0): Promise<Message[]> {
		
		const conversation = await this.conversationModel
			.findById(conversationId)
			.select('messages')
			.exec();

		if (!conversation) throw new NotFoundException('Conversations not found');

		// TODO : Paginando mensagens do array (você pode implementar melhor depois)
		const messages = conversation.messages
			.slice()
			.reverse()
			.slice(skip, skip + limit)
			.reverse();

		return messages;
	}
}
