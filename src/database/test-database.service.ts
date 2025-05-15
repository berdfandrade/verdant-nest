import {  Injectable, OnModuleDestroy } from "@nestjs/common";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

@Injectable()
export class TestDatabaseService implements OnModuleDestroy {
    private mongod : MongoMemoryServer;

    async start() : Promise<string> {
        this.mongod = await MongoMemoryServer.create();
        return this.mongod.getUri();
    }

    async stop() : Promise<void> {
        await mongoose.connection?.dropDatabase(); 
        await mongoose.connection?.close();
        await this.mongod?.stop();
    }

    async onModuleDestroy() {
        await this.stop(); 
    }
}
