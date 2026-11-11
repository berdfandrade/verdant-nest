import { Global, Logger, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { StorageConfig } from './storage.config';
import { StorageService } from './storage.service';

@Global()
@Module({
	providers: [
		{
			provide: StorageService,
			useFactory: (): StorageService => {
				const driver = StorageConfig.driver;
				new Logger('Storage').log(`Using "${driver}" storage driver`);
				return driver === 's3' ? new S3StorageService() : new LocalStorageService();
			},
		},
	],
	exports: [StorageService],
})
export class StorageModule {}
