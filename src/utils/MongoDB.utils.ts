import mongoose from 'mongoose';

export default class MongoDbUtils {
	static convertToMongoId(string: string): mongoose.Types.ObjectId {
		return new mongoose.Types.ObjectId(string);
	}
}
