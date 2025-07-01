import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { AppModule } from '../src/app.module';

export async function SetupTestApp() {
  let mongoServer;
  let mongoUri;

  if (process.env.NODE_ENV === 'test') {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  } else {
    mongoUri = process.env.MONGO_URI;
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [MongooseModule.forRoot(mongoUri), AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe());
  await app.init();

  return {
    app,
    mongoServer,
    moduleFixture,
  };
}
