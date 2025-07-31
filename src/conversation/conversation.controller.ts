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
import { User } from '../auth/decorators/user.decorator';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import MongoDbUtils from '../utils/MongoDB.utils';
import { ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../auth/decorators/admin-only-decorator';



@ApiTags('💬 Conversations')
// @UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationController {
	constructor(private readonly conversationService: ConversationService) {}

	@Post()
	async create(@Body() createDto: CreateConversationDto) {
		return this.conversationService;
	}

	@Get(':id')
	async findBydId(@Param('id') id: mongoose.Types.ObjectId, @Request() req: any) {
		const conversation = await this.conversationService.findById(id);

		const userId = req.user.id;
		const isParticipant = conversation.participants.includes(userId);

		if (!isParticipant) throw new ForbiddenException('Not allowed');
	}

	@AdminOnly()
	@Get()
	async getAllConversations() {
		return this.conversationService.getAllConversations();
	}

	@UseGuards(JwtAuthGuard)
	@Get('/between/users')
	async findBetweenUsers( @User() user: any, @Query('user1') user1: string, @Query('user2') user2: string ) {

		const id1 = MongoDbUtils.toObjectId(user1);
		const id2 = MongoDbUtils.toObjectId(user2);

		const id1Str = id1.toString();
		const id2Str = id2.toString();

		if (user.id !== id1Str && user.id !== id2Str) {
			throw new NotFoundException("Can't access this route");
		} 

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
