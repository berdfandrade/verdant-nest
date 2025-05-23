import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './message.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { ModifyMessage } from './dto/modify-message.dto';
import { Conversation } from '../conversation/schemas/conversation.schema';

@Injectable()
export class MessagesService {
	constructor(
		@InjectModel(Message.name) private messageModel: Model<Message>,
		@InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
	) {}

	// Cria / Manda uma nova mensagem
	async create(messageDto: SendMessageDto): Promise<Message> {
		const conversation = await this.conversationModel.findById(messageDto.conversationId);
		if (!conversation)
			throw new NotFoundException('Not able to send a message to an unexisting chat');

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
			{ content: dto.content },
			{ new: true },
		);
		if (!message) throw new NotFoundException('Message not found');

		return message;
	}

	async searchMessage(query: string): Promise<Message[]> {
		return this.messageModel
			.find({
				content: { $regex: query, $options: 'i' },
			})
			.exec();
	}
}
