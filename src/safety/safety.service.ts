import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '@/user/user.schema';
import { ConversationService } from '@/conversation/conversation.service';
import MongoDbUtils from '@/utils/MongoDB.utils';
import { Report, ReportStatus } from './report.schema';
import { CreateReportDto } from './dto/report.dto';

// Campos públicos de quem eu bloqueei
const BLOCKED_PROFILE_FIELDS = 'fullName username photos';

/*
	Bloquear um usuário:
	- desfaz likes e match nos dois sentidos e arquiva a conversa
	- some do feed para os dois (quem eu bloqueei e quem me bloqueou)
	- impede novos likes entre os dois
*/
@Injectable()
export class SafetyService {
	constructor(
		@InjectModel(User.name) private readonly userModel: Model<User>,
		@InjectModel(Report.name) private readonly reportModel: Model<Report>,
		private readonly conversationService: ConversationService,
	) {}

	async block(myId: Types.ObjectId | string, targetId: Types.ObjectId | string) {
		const me = MongoDbUtils.toObjectId(myId);
		const target = MongoDbUtils.toObjectId(targetId);

		if (me.equals(target)) throw new BadRequestException('You can not block yourself');
		if (!(await this.userModel.exists({ _id: target }))) throw new NotFoundException('User does not exist');

		await Promise.all([
			this.userModel.updateOne(
				{ _id: me },
				{
					$addToSet: { blockedUsers: target },
					$pull: { likedProfiles: target, likedYouProfiles: target, matches: target },
				},
			),
			this.userModel.updateOne(
				{ _id: target },
				{ $pull: { likedProfiles: me, likedYouProfiles: me, matches: me } },
			),
			this.conversationService.deactivateBetweenUsers(me, target),
		]);

		return { blocked: true };
	}

	async unblock(myId: Types.ObjectId | string, targetId: Types.ObjectId | string) {
		const target = MongoDbUtils.toObjectId(targetId);
		await this.userModel.updateOne({ _id: MongoDbUtils.toObjectId(myId) }, { $pull: { blockedUsers: target } });
		// Desbloquear não refaz o match nem reabre a conversa
		return { blocked: false };
	}

	async listBlocked(myId: Types.ObjectId | string) {
		const me = await this.userModel
			.findById(MongoDbUtils.toObjectId(myId))
			.populate({ path: 'blockedUsers', select: BLOCKED_PROFILE_FIELDS });

		if (!me) throw new NotFoundException('User does not exist');
		return me.blockedUsers;
	}

	// true se qualquer um dos dois bloqueou o outro
	async isBlockedBetween(a: Types.ObjectId | string, b: Types.ObjectId | string): Promise<boolean> {
		const idA = MongoDbUtils.toObjectId(a);
		const idB = MongoDbUtils.toObjectId(b);
		const found = await this.userModel.exists({
			$or: [
				{ _id: idA, blockedUsers: idB },
				{ _id: idB, blockedUsers: idA },
			],
		});
		return !!found;
	}

	async report(myId: Types.ObjectId | string, { userId, reason, details, block = true }: CreateReportDto) {
		const reporter = MongoDbUtils.toObjectId(myId);
		const reported = MongoDbUtils.toObjectId(userId);

		if (reporter.equals(reported)) throw new BadRequestException('You can not report yourself');
		if (!(await this.userModel.exists({ _id: reported }))) throw new NotFoundException('User does not exist');

		// Uma denúncia aberta por par: denunciar de novo atualiza a existente (evita spam)
		const report = await this.reportModel.findOneAndUpdate(
			{ reporter, reported, status: 'open' },
			{ $set: { reason, details } },
			{ new: true, upsert: true, setDefaultsOnInsert: true },
		);

		if (block) await this.block(reporter, reported);

		return { reported: true, blocked: block, reportId: report.id };
	}

	// ---- Admin ----

	async listReports(status?: ReportStatus, limit = 50, skip = 0) {
		const filter = status ? { status } : {};
		const [reports, total] = await Promise.all([
			this.reportModel
				.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.populate('reporter', 'fullName email')
				.populate('reported', 'fullName email active'),
			this.reportModel.countDocuments(filter),
		]);
		return { total, limit, skip, reports };
	}

	async reviewReport(reportId: string, status: Exclude<ReportStatus, 'open'>) {
		const report = await this.reportModel.findByIdAndUpdate(
			MongoDbUtils.toObjectId(reportId),
			{ status, reviewedAt: new Date() },
			{ new: true },
		);
		if (!report) throw new NotFoundException('Report not found');
		return report;
	}
}
