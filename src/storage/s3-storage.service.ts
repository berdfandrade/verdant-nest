import { Injectable } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageConfig } from './storage.config';
import { assertSafeKey, StorageService, StoredFile, UploadParams } from './storage.service';

// S3 ou compatível (MinIO, Cloudflare R2...), configurado por variáveis de ambiente
@Injectable()
export class S3StorageService extends StorageService {
	private readonly config = StorageConfig.s3;
	readonly client: S3Client;

	constructor(client?: S3Client) {
		super();
		if (!this.config.bucket) throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3');

		const { region, endpoint, accessKeyId, secretAccessKey } = this.config;
		this.client =
			client ??
			new S3Client({
				region,
				endpoint,
				forcePathStyle: !!endpoint,
				credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
			});
	}

	async upload({ key, body, contentType }: UploadParams): Promise<StoredFile> {
		assertSafeKey(key);
		await this.client.send(
			new PutObjectCommand({
				Bucket: this.config.bucket,
				Key: key,
				Body: body,
				ContentType: contentType,
				// Nome do arquivo é um UUID: o conteúdo de uma chave nunca muda
				CacheControl: 'public, max-age=31536000, immutable',
			}),
		);
		return { key, url: `${this.config.publicUrl}/${key}` };
	}

	async delete(key: string): Promise<void> {
		assertSafeKey(key);
		await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
	}
}
