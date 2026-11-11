/*
	Contrato do armazenamento de arquivos.
	É uma classe abstrata para servir também como token de injeção:
	`constructor(private storage: StorageService)` recebe o driver configurado.
*/

export interface UploadParams {
	/** Caminho/nome do objeto, ex.: users/<id>/<uuid>.jpg */
	key: string;
	body: Buffer;
	contentType: string;
}

export interface StoredFile {
	key: string;
	/** URL pública para o app exibir */
	url: string;
}

export abstract class StorageService {
	abstract upload(params: UploadParams): Promise<StoredFile>;
	abstract delete(key: string): Promise<void>;
}

// Chaves são geradas pela API, mas validamos para evitar path traversal ("../")
export function assertSafeKey(key: string) {
	if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes('..') || key.startsWith('/')) {
		throw new Error(`Invalid storage key: ${key}`);
	}
}
