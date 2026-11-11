import { join, resolve } from 'path';

/*
	Configuração lida em tempo de execução (depois do .env carregar).

	STORAGE_DRIVER=local (padrão) | s3

	local:
	  UPLOADS_DIR         pasta onde os arquivos são salvos (padrão: ./uploads)
	  UPLOADS_PUBLIC_URL  prefixo das URLs (padrão: /uploads, servido pela própria API)

	s3 (ou compatível: MinIO, Cloudflare R2...):
	  S3_BUCKET, S3_REGION (padrão us-east-1)
	  S3_ENDPOINT         opcional, para provedores compatíveis (usa path-style)
	  S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY   opcionais (senão, cadeia padrão da AWS)
	  S3_PUBLIC_URL       prefixo das URLs públicas (ex.: CDN). Padrão: URL do bucket
*/

export const UPLOADS_SERVE_ROOT = '/uploads';

export const StorageConfig = {
	get driver(): 'local' | 's3' {
		return process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
	},
	get uploadsDir() {
		return resolve(process.env.UPLOADS_DIR || join(process.cwd(), 'uploads'));
	},
	get uploadsPublicUrl() {
		return (process.env.UPLOADS_PUBLIC_URL || UPLOADS_SERVE_ROOT).replace(/\/$/, '');
	},
	get s3() {
		const bucket = process.env.S3_BUCKET || '';
		const region = process.env.S3_REGION || 'us-east-1';
		const endpoint = process.env.S3_ENDPOINT || undefined;
		const defaultPublicUrl = endpoint
			? `${endpoint.replace(/\/$/, '')}/${bucket}`
			: `https://${bucket}.s3.${region}.amazonaws.com`;

		return {
			bucket,
			region,
			endpoint,
			accessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
			secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined,
			publicUrl: (process.env.S3_PUBLIC_URL || defaultPublicUrl).replace(/\/$/, ''),
		};
	},
};
