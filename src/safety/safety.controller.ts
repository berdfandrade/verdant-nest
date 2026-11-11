import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { User } from '@/auth/decorators/user.decorator';
import { SafetyService } from './safety.service';
import { CreateReportDto } from './dto/report.dto';

@ApiTags('🛡️ Safety')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('safety')
export class SafetyController {
	constructor(private readonly safetyService: SafetyService) {}

	@Get('blocked')
	async blocked(@User() user: any) {
		return this.safetyService.listBlocked(user._id);
	}

	@Post('block/:userId')
	@HttpCode(200)
	async block(@User() user: any, @Param('userId') userId: string) {
		return this.safetyService.block(user._id, userId);
	}

	@Delete('block/:userId')
	async unblock(@User() user: any, @Param('userId') userId: string) {
		return this.safetyService.unblock(user._id, userId);
	}

	@Post('report')
	async report(@User() user: any, @Body() dto: CreateReportDto) {
		return this.safetyService.report(user._id, dto);
	}
}
