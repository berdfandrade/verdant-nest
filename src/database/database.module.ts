import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestDatabaseService } from './test-database.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri(); 
        return {
          uri,
        };
      },
    }),
  ],
  providers: [TestDatabaseService],
  exports: [TestDatabaseService],
})

export class DatabaseModule {}
