import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const REPORT_REASONS = [
	'spam',
	'fake_profile',
	'harassment',
	'inappropriate_content',
	'underage',
	'scam',
	'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ['open', 'reviewed', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true })
export class Report extends Document {
	@Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
	reporter: Types.ObjectId;

	@Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
	reported: Types.ObjectId;

	@Prop({ type: String, enum: REPORT_REASONS, required: true })
	reason: ReportReason;

	@Prop({ type: String, maxlength: 1000 })
	details?: string;

	@Prop({ type: String, enum: REPORT_STATUSES, default: 'open' })
	status: ReportStatus;

	@Prop({ type: Date })
	reviewedAt?: Date;

	createdAt: Date;
	updatedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reported: 1 });
