import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { Message } from './schemas/message.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Controller('conversations')
export class ConversationController {
	constructor(private readonly conversationService: ConversationService) {}

	// POST /conversations
	@Post()
	async create(@Body() createDto: CreateConversationDto) {
		return this.conversationService;
	}

	// GET /conversations/:id
	@Get(':id')
	async findBydId(@Param('id') id: string) {
		return this.conversationService.findById(id);
	}

	// GET /conversations/between?user1=1...&user2=...
	@Get('/between/users')
	async findBetweenUsers(@Query('user1') user1: string, @Query('user2') user2: string) {
		const conversation = await this.conversationService.findBetweenUsers(user1, user2);
		if (!conversation) throw new NotFoundException('Conversation not found');
		return conversation;
	}
}
