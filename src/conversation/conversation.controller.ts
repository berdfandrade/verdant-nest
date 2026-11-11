import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Query,
	NotFoundException,
	ForbiddenException,
	UseGuards,
	Delete,
	DefaultValuePipe,
	ParseIntPipe,
} from '@nestjs/common';
import { User } from '../auth/decorators/user.decorator';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import MongoDbUtils from '../utils/MongoDB.utils';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../auth/decorators/admin-only-decorator';

@ApiTags('💬 Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationController {
	constructor(private readonly conversationService: ConversationService) {}

	// Conversas normalmente nascem de um match; criação manual é só para admin
	@AdminOnly()
	@Post()
	async create(@Body() createDto: CreateConversationDto) {
		return this.conversationService.create(createDto);
	}

	@AdminOnly()
	@Get()
	async getAllConversations() {
		return this.conversationService.getAllConversations();
	}

	// Minhas conversas ativas (com a última mensagem)
	@UseGuards(JwtAuthGuard)
	@Get('me')
	async myConversations(@User() user: any) {
		return this.conversationService.findByUser(user.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('/between/users')
	async findBetweenUsers(
		@User() user: any,
		@Query('user1') user1: string,
		@Query('user2') user2: string,
	) {
		const id1 = MongoDbUtils.toObjectId(user1);
		const id2 = MongoDbUtils.toObjectId(user2);

		if (user.id !== id1.toString() && user.id !== id2.toString()) {
			throw new ForbiddenException("Can't access this route");
		}

		const conversation = await this.conversationService.findBetweenUsers(id1, id2);
		if (!conversation) throw new NotFoundException('Conversation not found');
		return conversation;
	}

	@UseGuards(JwtAuthGuard)
	@Get(':id')
	async findById(@Param('id') id: string, @User() user: any) {
		return this.conversationService.findForParticipant(id, user.id);
	}

	@UseGuards(JwtAuthGuard)
	@ApiQuery({ name: 'limit', required: false, type: Number })
	@ApiQuery({ name: 'skip', required: false, type: Number })
	@Get(':id/messages')
	async getMessages(
		@Param('id') id: string,
		@User() user: any,
		@Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
		@Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
	) {
		await this.conversationService.findForParticipant(id, user.id);
		return this.conversationService.getMessages(id, Math.min(limit, 100), skip);
	}

	@AdminOnly()
	@Delete(':id')
	async deleteConversation(@Param('id') id: string) {
		const Id = MongoDbUtils.toObjectId(id);
		return this.conversationService.deleteConversation(Id);
	}
}
