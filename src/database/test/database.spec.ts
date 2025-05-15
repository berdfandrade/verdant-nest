import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../../database/database.module'; // ajuste esse path se necessário
import mongoose from 'mongoose';
import { DatabaseConfig } from '../database.config';

describe('🍃 MongoDB Connection', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();

    // Aqui é o segredo: aguarda conexão estar pronta
    await mongoose.connect(DatabaseConfig.DATABASE_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('🔗 Should CONNECT successfully to the REAL DB', async () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = conectado
  });
});


