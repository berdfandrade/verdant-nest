import { NestExpressApplication } from '@nestjs/platform-express';
import { StorageConfig, UPLOADS_SERVE_ROOT } from '@/storage/storage.config';

/*
	No driver local, a própria API serve as fotos enviadas em /uploads.
	(No driver S3 as URLs apontam direto para o bucket/CDN.)

	Registrado no main.ts e no SetupTestApp: o ServeStaticModule não funciona
	em testes, porque escolhe o loader antes de o adaptador HTTP existir.
*/
export function configureUploads(app: NestExpressApplication) {
	if (StorageConfig.driver !== 'local') return;

	app.useStaticAssets(StorageConfig.uploadsDir, {
		prefix: UPLOADS_SERVE_ROOT,
		index: false,
		fallthrough: false,
		// Fotos têm nome único (UUID): podem ficar em cache
		maxAge: '1y',
		immutable: true,
	});
}
