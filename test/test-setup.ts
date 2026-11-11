import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '@/app.module';
import { validationPipeConfig } from '@/config/validation-pipe.config';
import { configureCors } from '@/config/cors.config';
import { configureUploads } from '@/config/uploads.config';
import { NestExpressApplication } from '@nestjs/platform-express';

/*
  Sobe a aplicação inteira (AppModule) para os testes.

  Em NODE_ENV=test o banco é um MongoMemoryServer: a URI é colocada em
  MONGO_URI ANTES de compilar o módulo, assim o DatabaseModule conecta nele
  (uma única conexão) e os testes nunca tocam no banco real.
*/
export async function SetupTestApp() {
  let mongoServer;

  if (process.env.NODE_ENV === 'test') {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  validationPipeConfig(app);
  configureCors(app);
  configureUploads(app);
  await app.init();

  return {
    app,
    mongoServer,
    moduleFixture,
  };
}
