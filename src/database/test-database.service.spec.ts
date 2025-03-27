// src/test-database/test-database.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseService } from './test-database.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from './database.module';

describe('TestDatabaseService', () => {
  let service: TestDatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    service = module.get<TestDatabaseService>(TestDatabaseService);
  });

  it('deve conectar ao MongoMemoryServer', async () => {
    expect(service).toBeDefined();
    // Aqui você pode realizar assertivas ou interagir com o banco de dados
  });
});
