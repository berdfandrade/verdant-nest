import { Controller, Body, Post, Patch, Delete, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/modify-message.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { User } from '@/auth/decorators/user.decorator';
import { ConversationService } from '@/conversation/conversation.service';
import MongoDbUtils from '@/utils/MongoDB.utils';

@ApiTags('✉️ Message')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
	constructor(
		private readonly messageService: MessagesService,
		private readonly conversationService: ConversationService,
	) {}

	@Post()
	async send(@Body() data: SendMessageDto, @User() user: any) {
		return this.messageService.create({ ...data, sender: user._id });
	}

	@Get('search')
	async search(
		@User() user: any,
		@Query('conversationId') conversationId: string,
		@Query('q') q: string,
	) {
		if (!q) throw new BadRequestException('Query param "q" is required');
		await this.conversationService.findForParticipant(conversationId, user.id);
		return this.messageService.searchMessage(q, conversationId);
	}

	@Patch(':id')
	async edit(@Param('id') id: string, @Body() dto: EditMessageDto, @User() user: any) {
		return this.messageService.modifyMessage({
			messageId: MongoDbUtils.toObjectId(id),
			sender: user._id,
			content: dto.content,
		});
	}

	@Delete(':id')
	async remove(@Param('id') id: string, @User() user: any) {
		return this.messageService.deleteMessage(id, user._id);
	}
}
