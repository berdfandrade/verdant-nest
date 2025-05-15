import { Module, Global } from "@nestjs/common";
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseConfig } from "./database.config";

@Global()
@Module({
  imports : [MongooseModule.forRoot(DatabaseConfig.DATABASE_URI)],
  exports: [MongooseModule]
})
export class DatabaseModule {}