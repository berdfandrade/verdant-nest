import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';

export function validationPipeConfig(app: INestApplication) {
    app.useGlobalPipes(new ValidationPipe());
}
