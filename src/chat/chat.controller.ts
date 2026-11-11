import { Controller, Get } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '@/auth/decorators/admin-only-decorator';

@ApiTags('🦜 Chat')
@Controller('chat')
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	// Rota de diagnóstico do Redis
	@ApiBearerAuth()
	@AdminOnly()
	@Get('redis')
	async testRedis() {
		return this.chatService.testRedisConnection();
	}
}
