// Imagens mínimas para os testes de upload

// PNG 1x1 válido
export const PNG_1PX = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64',
);

// Só os bytes iniciais de cada formato (a API detecta o tipo pela assinatura)
export const JPEG_HEADER = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
export const WEBP_HEADER = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 '), Buffer.alloc(8)]);

// Texto qualquer (não é imagem, mesmo que o cliente diga que é)
export const NOT_AN_IMAGE = Buffer.from('isto não é uma imagem, é só texto fingindo ser png');
