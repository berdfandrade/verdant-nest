import { INestApplication, ValidationPipe } from '@nestjs/common';

export function validationPipeConfig(app: INestApplication) {
	// whitelist: remove do body qualquer campo que não esteja declarado no DTO
	app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
}
