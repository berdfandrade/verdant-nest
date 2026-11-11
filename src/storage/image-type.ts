/*
	Descobre o tipo da imagem pelos primeiros bytes do arquivo ("magic bytes").
	Não confiamos no Content-Type/extensão enviados pelo cliente.
*/

export interface ImageType {
	mime: 'image/jpeg' | 'image/png' | 'image/webp';
	ext: 'jpg' | 'png' | 'webp';
}

export function detectImageType(buffer: Buffer): ImageType | null {
	if (!buffer || buffer.length < 12) return null;

	// JPEG: FF D8 FF
	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return { mime: 'image/jpeg', ext: 'jpg' };
	}

	// PNG: 89 50 4E 47 0D 0A 1A 0A
	const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (pngSignature.every((byte, i) => buffer[i] === byte)) {
		return { mime: 'image/png', ext: 'png' };
	}

	// WEBP: "RIFF" .... "WEBP"
	if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
		return { mime: 'image/webp', ext: 'webp' };
	}

	return null;
}
