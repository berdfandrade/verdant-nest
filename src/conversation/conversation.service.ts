import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../messages/message.schema';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import MongoDbUtils from '../utils/MongoDB.utils';

interface IFindConversationUsers {
	id1: Types.ObjectId;
	id2: Types.ObjectId;
}

@Injectable()
export class ConversationService {
	constructor(
		@InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
		@InjectModel(Message.name) private messageModel: Model<MessageDocument>,
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
		const objId = MongoDbUtils.toObjectId(id);
		const conversation = await this.conversationModel
			.findById(objId)
			.populate('messages')
			.exec();
		if (!conversation) throw new NotFoundException(`Conversation not found with ID ${id}`);
		return conversation;
	}

	// Busca conversa entre dois users
	async findBetweenUsers(
		id1: Types.ObjectId,
		id2: Types.ObjectId,
	): Promise<Conversation | null> {
		return this.conversationModel
			.findOne({
				participants: { $all: [id1, id2] },
				isActive: true,
			})
			.exec();
	}

	// Busca todas as conversas
	async getAllConversations() {
		const conversations = await this.conversationModel
			.find()
			.populate('participants', 'fullName');

		if (conversations.length === 0) throw new NotFoundException('Conversations not found');
		return conversations;
	}
	
	// Busca mensagens de uma conversa (pode ser paginado)
	async getMessages(conversationId: Types.ObjectId, limit = 50, skip = 0): Promise<Message[]> {
		const conversation = await this.conversationModel
			.findById(conversationId)
			.populate('messages')
			.exec();

		if (!conversation) throw new NotFoundException('Conversations not found');

		// Busca as mensagens da conversa, ordenando por data (sentAt) ascendente ou descendente
		// Se quiser as mais recentes primeiro, ordena por sentAt desc
		const messages = await this.messageModel
			.find({ conversationId })
			.sort({ sentAt: -1 }) // Mensagens mais recentes primeiro
			.skip(skip)
			.limit(limit)
			.exec();

		return messages;
	}

	// Deleta conversa
	async deleteConversation(conversationId: Types.ObjectId) {
		const deleted = await this.conversationModel.findByIdAndDelete(conversationId);
		if (!deleted) throw new NotFoundException('Conversation not found');
		return { message: 'Successfully deleted' };
	}
}
