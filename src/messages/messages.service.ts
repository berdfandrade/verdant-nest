import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './message.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { ModifyMessage } from './dto/modify-message.dto';
import { Conversation } from '@/conversation/schemas/conversation.schema';
import MongoDbUtils from '@/utils/MongoDB.utils';

@Injectable()
export class MessagesService {
	constructor(
		@InjectModel(Message.name) private messageModel: Model<Message>,
		@InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
	) {}

	// Cria | Manda uma nova mensagem
	async create(messageDto: SendMessageDto): Promise<Message> {
		const conversation = await this.conversationModel.findById(messageDto.conversationId);
		if (!conversation)
			throw new NotFoundException('Not able to send a message to an unexisting chat');

		const isParticipant = conversation.participants.some(p =>
			MongoDbUtils.sameId(p, messageDto.sender),
		);
		if (!isParticipant) throw new ForbiddenException('User not in conversation');

		if (!conversation.isActive)
			throw new ForbiddenException('This conversation is no longer active');

		const newMessage = new this.messageModel(messageDto);
		const savedMessage = await newMessage.save();

		// Atualiza o array messages da conversa
		conversation.messages.push(savedMessage.id);
		await conversation.save();

		return savedMessage;
	}

	async modifyMessage(dto: ModifyMessage): Promise<Message> {
		const message = await this.messageModel.findOneAndUpdate(
			{ _id: dto.messageId, sender: dto.sender },
			{ content: dto.content, editedAt: new Date() },
			{ new: true },
		);
		if (!message) throw new NotFoundException('Message not found');

		return message;
	}

	async deleteMessage(messageId: Types.ObjectId | string, sender: Types.ObjectId | string) {
		const message = await this.messageModel.findOneAndDelete({
			_id: MongoDbUtils.toObjectId(messageId),
			sender: MongoDbUtils.toObjectId(sender),
		});
		if (!message) throw new NotFoundException('Message not found');

		await this.conversationModel.updateOne(
			{ _id: message.conversationId },
			{ $pull: { messages: message._id } },
		);

		return { deleted: true };
	}

	// Marca como lidas as mensagens da conversa que eu recebi
	async markConversationRead(conversationId: Types.ObjectId | string, readerId: Types.ObjectId | string) {
		const readAt = new Date();
		const { modifiedCount } = await this.messageModel.updateMany(
			{
				conversationId: MongoDbUtils.toObjectId(conversationId),
				sender: { $ne: MongoDbUtils.toObjectId(readerId) },
				readAt: null,
			},
			{ $set: { readAt } },
		);
		return { conversationId: String(conversationId), readAt, count: modifiedCount };
	}

	async countUnread(conversationId: Types.ObjectId | string, userId: Types.ObjectId | string) {
		return this.messageModel.countDocuments({
			conversationId: MongoDbUtils.toObjectId(conversationId),
			sender: { $ne: MongoDbUtils.toObjectId(userId) },
			readAt: null,
		});
	}

	// Busca por texto. Se conversationId for passado, busca só dentro da conversa
	async searchMessage(query: string, conversationId?: Types.ObjectId | string): Promise<Message[]> {
		const filter: Record<string, any> = {
			content: { $regex: MongoDbUtils.escapeRegex(query), $options: 'i' },
		};

		if (conversationId) filter.conversationId = MongoDbUtils.toObjectId(conversationId);

		return this.messageModel.find(filter).sort({ sentAt: -1 }).limit(50).exec();
	}
}
