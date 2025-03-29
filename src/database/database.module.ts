import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestDatabaseService } from './test-database.service';
import { MongoMemoryServer } from 'mongodb-memory-server';

const isTesting = process.env.NODE_ENV === 'test'
const MongoURI = process.env.MONGO_URI

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: async () => {
        const mongoServer = await MongoMemoryServer.create();
        const uri = isTesting ? mongoServer.getUri() : MongoURI 
        return { uri };
      },
    }),
  ],
  providers: [TestDatabaseService],
  exports: [TestDatabaseService],
})

export class DatabaseModule {}
