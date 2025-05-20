import mongoose from 'mongoose';
import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Query,
	NotFoundException,
	Request,
	ForbiddenException,
	UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { Message } from './schemas/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import ObjectId from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('conversations')
export class ConversationController {
	constructor(private readonly conversationService: ConversationService) {}

	// POST /conversations
	@Post()
	async create(@Body() createDto: CreateConversationDto) {
		return this.conversationService;
	}

	// GET /conversations/:id
	@UseGuards(JwtAuthGuard)
	@Get(':id')
	async findBydId(
		@Param('id') id: mongoose.Types.ObjectId,
		@Request() req: any,
	) {
		const conversation = await this.conversationService.findById(id)

		// Verifica se o usuário faz parte da conversa
		const userId = req.user.id;
		const isParticipant = conversation.participants.includes(userId);

		if(!isParticipant) throw new ForbiddenException('Not allowed')
	}

	// GET /conversations/between?user1=1...&user2=...
	@Get('/between/users')
	async findBetweenUsers(
		@Query('user1') user1: mongoose.Types.ObjectId,
		@Query('user2') user2: mongoose.Types.ObjectId,
	) {
		const conversation = await this.conversationService.findBetweenUsers(user1, user2);
		if (!conversation) throw new NotFoundException('Conversation not found');
		return conversation;
	}
}
