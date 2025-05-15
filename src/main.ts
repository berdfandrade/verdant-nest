import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureViews } from './config/views.config';
import { validationPipeConfig } from './config/validation-pipe.config';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const PORT = process.env.PORT || 3000;
    setupSwagger(app)
    configureViews(app)
    validationPipeConfig(app)

  await app.listen(PORT);
  console.log(`🚀 Server is running on http://localhost:${PORT}`);

}
bootstrap();
