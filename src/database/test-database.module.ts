import { Module, Global } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TestDatabaseService } from "./test-database.service";

@Global()
@Module({
  providers: [TestDatabaseService],
  exports: [TestDatabaseService],
  imports: [
    MongooseModule.forRootAsync({
      inject: [TestDatabaseService],
      useFactory: async (dbService: TestDatabaseService) => {
        const uri = await dbService.start();
        return { uri }
      },
    }),
  ],
})
export class TestDatabaseModule {}
