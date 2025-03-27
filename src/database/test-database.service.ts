// src/test-database/test-database.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Mongoose } from 'mongoose';

@Injectable()
export class TestDatabaseService implements OnModuleDestroy {
  private mongoServer: MongoMemoryServer;
  private mongoose: Mongoose;

  async onModuleInit() {
    this.mongoServer = await MongoMemoryServer.create();
    const uri = this.mongoServer.getUri();
    this.mongoose = new Mongoose();
    
    // Conectando-se ao MongoMemoryServer
    await this.mongoose.connect(uri)
    console.log('Conectado ao MongoMemoryServer');
  }

  async onModuleDestroy() {
    if (this.mongoose) {
      await this.mongoose.disconnect();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
    console.log('Instância do MongoMemoryServer desconectada');
  }
}
