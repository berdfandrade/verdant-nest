import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export default class MongoDbUtils {
	static toObjectId(id: string | Types.ObjectId): Types.ObjectId {
		if (id instanceof Types.ObjectId) return id;
		if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
			throw new BadRequestException(`Invalid id: ${id}`);
		}
		return new Types.ObjectId(id);
	}

	static sameId(a: unknown, b: unknown): boolean {
		if (!a || !b) return false;
		return String((a as any)?._id ?? a) === String((b as any)?._id ?? b);
	}

	static escapeRegex(text: string): string {
		return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}
