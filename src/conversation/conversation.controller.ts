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
	Delete,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import MongoDbUtils from 'src/utils/MongoDB.utils';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('💬 Conversations')
@Controller('conversations')
export class ConversationController {
	constructor(private readonly conversationService: ConversationService) {}

	@Post()
	async create(@Body() createDto: CreateConversationDto) {
		return this.conversationService;
	}

	@UseGuards(JwtAuthGuard)
	@Get(':id')
	async findBydId(@Param('id') id: mongoose.Types.ObjectId, @Request() req: any) {
		const conversation = await this.conversationService.findById(id);

		// Verifica se o usuário faz parte da conversa
		const userId = req.user.id;
		const isParticipant = conversation.participants.includes(userId);

		if (!isParticipant) throw new ForbiddenException('Not allowed');
	}

	@UseGuards(JwtAuthGuard)
	@Get('/between/users')
	async findBetweenUsers(@Query('user1') user1: string, @Query('user2') user2: string ) {

		const id1 = MongoDbUtils.toObjectId(user1)
		const id2 = MongoDbUtils.toObjectId(user2)

		const conversation = await this.conversationService.findBetweenUsers(id1, id2);
		if (!conversation) throw new NotFoundException('Conversation not found');
		return conversation;
	}

	@Delete(':id')
	async deleteConversation(@Param('id') id: string) {
		const Id = MongoDbUtils.toObjectId(id);
		const result = await this.conversationService.deleteConversation(Id);
		return result;
	}
}
