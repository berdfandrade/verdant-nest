
import { Types } from 'mongoose';

export default class MongoDbUtils {
static toObjectId(id: string | Types.ObjectId): Types.ObjectId {
	return typeof id === 'string' ? new Types.ObjectId(id) : id;
}

}
