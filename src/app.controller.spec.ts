import { Test, TestingModule } from '@nestjs/testing';
import { configureViews } from './config/views.config';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();

    configureViews(app); 

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) should render HTML', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect((res) => {
        expect(res.text).toContain('<!DOCTYPE html');
      });
  });
});
