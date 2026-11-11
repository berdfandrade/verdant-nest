import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseConfig } from './database.config';

@Global()
@Module({
	imports: [
		MongooseModule.forRootAsync({
			useFactory: () => ({ uri: DatabaseConfig.DATABASE_URI }),
		}),
	],
	exports: [MongooseModule],
})
export class DatabaseModule {}
