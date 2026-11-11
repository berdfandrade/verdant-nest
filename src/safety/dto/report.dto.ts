import { IsBoolean, IsIn, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { REPORT_REASONS, REPORT_STATUSES, type ReportReason, type ReportStatus } from '../report.schema';

export class CreateReportDto {
	@IsMongoId()
	userId: string;

	@IsIn(REPORT_REASONS)
	reason: ReportReason;

	@IsOptional()
	@IsString()
	@MaxLength(1000)
	details?: string;

	// Denunciar também bloqueia, a não ser que o usuário peça o contrário
	@IsOptional()
	@IsBoolean()
	block?: boolean;
}

export class ReviewReportDto {
	@IsIn(REPORT_STATUSES.filter(status => status !== 'open'))
	status: Exclude<ReportStatus, 'open'>;
}
