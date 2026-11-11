import { Injectable, Logger } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { StorageConfig } from './storage.config';
import { assertSafeKey, StorageService, StoredFile, UploadParams } from './storage.service';

// Salva no disco; os arquivos são servidos pela própria API em /uploads
@Injectable()
export class LocalStorageService extends StorageService {
	private readonly logger = new Logger('LocalStorage');

	constructor(
		private readonly dir = StorageConfig.uploadsDir,
		private readonly publicUrl = StorageConfig.uploadsPublicUrl,
	) {
		super();
	}

	async upload({ key, body }: UploadParams): Promise<StoredFile> {
		assertSafeKey(key);
		const path = join(this.dir, key);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, body);
		return { key, url: `${this.publicUrl}/${key}` };
	}

	async delete(key: string): Promise<void> {
		assertSafeKey(key);
		try {
			await unlink(join(this.dir, key));
		} catch (error: any) {
			// Arquivo já não existe: tudo bem
			if (error?.code !== 'ENOENT') this.logger.warn(`Could not delete ${key}: ${error?.message}`);
		}
	}
}
