import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '@/user/user.module';
import { ConversationModule } from '@/conversation/conversation.module';
import { Report, ReportSchema } from './report.schema';
import { SafetyService } from './safety.service';
import { SafetyController } from './safety.controller';

@Module({
	imports: [
		UserModule,
		ConversationModule,
		MongooseModule.forFeature([{ name: Report.name, schema: ReportSchema }]),
	],
	controllers: [SafetyController],
	providers: [SafetyService],
	exports: [SafetyService],
})
export class SafetyModule {}
