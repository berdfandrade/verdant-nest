import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../messages/message.schema';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import MongoDbUtils from '../utils/MongoDB.utils';

// Campos públicos de um participante quando populado
const PARTICIPANT_FIELDS = 'fullName username photos verified';

@Injectable()
export class ConversationService {
	constructor(
		@InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
		@InjectModel(Message.name) private messageModel: Model<MessageDocument>,
	) {}

	// Cria uma nova conversa
	async create(createDto: CreateConversationDto): Promise<Conversation> {
		if (createDto.participants?.length !== 2) {
			throw new BadRequestException('Conversation must have exactly 2 participants.');
		}

		const newConversation = new this.conversationModel(createDto);
		return newConversation.save();
	}

	/*
		Usado quando há um match: se os dois já tiveram uma conversa
		(ex.: deram unlike e depois match de novo), ela é reativada.
	*/
	async createOrReactivate(
		id1: Types.ObjectId | string,
		id2: Types.ObjectId | string,
	): Promise<Conversation> {
		const existing = await this.conversationModel.findOne({
			participants: { $all: [MongoDbUtils.toObjectId(id1), MongoDbUtils.toObjectId(id2)] },
		});

		if (existing) {
			existing.isActive = true;
			existing.archivedAt = undefined;
			return existing.save();
		}

		return this.create({
			participants: [MongoDbUtils.toObjectId(id1), MongoDbUtils.toObjectId(id2)],
		});
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

	// Garante que o usuário participa da conversa e retorna a conversa
	async findForParticipant(
		conversationId: string | Types.ObjectId,
		userId: string | Types.ObjectId,
	): Promise<Conversation> {
		const conversation = await this.conversationModel
			.findById(MongoDbUtils.toObjectId(conversationId))
			.populate('participants', PARTICIPANT_FIELDS)
			.exec();

		if (!conversation) throw new NotFoundException(`Conversation not found with ID ${conversationId}`);

		if (!this.isParticipant(conversation, userId)) {
			throw new ForbiddenException('You are not a participant of this conversation');
		}

		return conversation;
	}

	isParticipant(conversation: Conversation, userId: string | Types.ObjectId): boolean {
		return conversation.participants.some(p => MongoDbUtils.sameId(p, userId));
	}

	// Lista as conversas ativas do usuário, da mais recente para a mais antiga
	async findByUser(userId: string | Types.ObjectId) {
		const id = MongoDbUtils.toObjectId(userId);

		const conversations = await this.conversationModel
			.find({ participants: id, isActive: true })
			.populate('participants', PARTICIPANT_FIELDS)
			.sort({ startedAt: -1 })
			.lean()
			.exec();

		// Anexa a última mensagem de cada conversa
		return Promise.all(
			conversations.map(async conversation => {
				const lastMessage = await this.messageModel
					.findOne({ conversationId: conversation._id })
					.sort({ sentAt: -1 })
					.lean()
					.exec();

				const { messages, ...rest } = conversation as any;
				return { ...rest, lastMessage: lastMessage ?? null };
			}),
		);
	}

	// Busca conversa entre dois users
	async findBetweenUsers(id1: Types.ObjectId, id2: Types.ObjectId): Promise<Conversation | null> {
		return this.conversationModel
			.findOne({
				participants: { $all: [id1, id2] },
				isActive: true,
			})
			.populate('participants', 'fullName photos')
			.exec();
	}

	// Busca todas as conversas
	async getAllConversations() {
		const conversations = await this.conversationModel
			.find()
			.populate('participants', 'fullName photos');

		if (conversations.length === 0) throw new NotFoundException('Conversations not found');
		return conversations;
	}

	// Busca mensagens de uma conversa (paginado, mais recentes primeiro)
	async getMessages(conversationId: Types.ObjectId | string, limit = 50, skip = 0): Promise<Message[]> {
		const id = MongoDbUtils.toObjectId(conversationId);
		const exists = await this.conversationModel.exists({ _id: id });

		if (!exists) throw new NotFoundException('Conversations not found');

		const messages = await this.messageModel
			.find({ conversationId: id })
			.sort({ sentAt: -1 })
			.skip(skip)
			.limit(limit)
			.exec();

		return messages;
	}

	// Arquiva a conversa entre dois usuários (ex.: quando o match é desfeito)
	async deactivateBetweenUsers(id1: Types.ObjectId | string, id2: Types.ObjectId | string) {
		await this.conversationModel.updateMany(
			{
				participants: { $all: [MongoDbUtils.toObjectId(id1), MongoDbUtils.toObjectId(id2)] },
				isActive: true,
			},
			{ isActive: false, archivedAt: new Date() },
		);
	}

	// Deleta conversa (e suas mensagens)
	async deleteConversation(conversationId: Types.ObjectId) {
		const deleted = await this.conversationModel.findByIdAndDelete(conversationId);
		if (!deleted) throw new NotFoundException('Conversation not found');
		await this.messageModel.deleteMany({ conversationId });
		return { message: 'Successfully deleted' };
	}
}
