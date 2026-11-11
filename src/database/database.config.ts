export const DatabaseConfig = {
	get DATABASE_URI() {
		return process.env.MONGO_URI || 'mongodb://localhost:27017/verdant';
	},
};
