import Service from "service";
import { RedisClient } from 'redis';
import Database from "lib/database";
import { MongoClient } from "mongodb";

export interface StatusResult {
  active: boolean;
}

export class Status extends Service {
  constructor(
    readonly database: Database,
    readonly redisClient: RedisClient
  ) {
    super(database);
  }
  getStatus = async () => {
    const redisWorks = this.redisClient.connected;
    let databaseWorks = false;
    try {
      const client: MongoClient = await this.database.connect();
      databaseWorks = !!client;
      client.close();
    } catch (e) {
      return {
        active: false
      }
    }
    
    return {
      active: redisWorks && databaseWorks
    }
  }
}

export default Status;