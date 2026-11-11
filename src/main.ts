import * as morgan from 'morgan'
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureViews } from './config/views.config';
import { validationPipeConfig } from './config/validation-pipe.config';
import { setupSwagger } from './config/swagger.config';
import { configureCors } from './config/cors.config';
import { configureUploads } from './config/uploads.config';

async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const MODE = process.env.NODE_ENV
  const PORT = process.env.PORT || 3000;
  // Atrás de proxy/load balancer, o IP real vem do X-Forwarded-For (usado no rate limiting)
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)
    setupSwagger(app)
    configureCors(app)
    configureViews(app)
    configureUploads(app)
    app.use(morgan('dev'))
    validationPipeConfig(app)

  await app.listen(PORT);
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
}
bootstrap();
