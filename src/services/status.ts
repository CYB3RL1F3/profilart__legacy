import Service from "service";
import { RedisClient } from 'redis';
import Database from "lib/database";
import { MongoClient } from "mongodb";
import Mailer from "lib/mailer";
import { withScope, captureException } from "@sentry/node";
import err from "err";
import config from "config";

export interface StatusResult {
  active: boolean;
}

export interface SupportMessage {
  email: string;
  uid?: string;
  question: string;
  content: string;
  name?: string;
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
      withScope((scope) => {
        scope.setExtra("service is not up !!", e);
        captureException(e);
      });
      return {
        active: false
      }
    }
    if (!redisWorks || !databaseWorks) {
      withScope((scope) => {
        scope.setExtra(redisWorks ? "Redis is up" : "Redis is not up", redisWorks);
        scope.setExtra(redisWorks ? "Database is up" : "Database is not up", databaseWorks);
        captureException("Finally service is not up");
      });
    }
    return {
      active: redisWorks && databaseWorks
    }
  }

  contactSupport = async (xx, args: SupportMessage) => {
    try {
      const mailer = new Mailer(null);
      const isSent = await mailer.send<SupportMessage>("support.html", {
        subject: 'New support message',
        name: args.name,
        email: args.email,
        dest: config.mailer.support,
        ...args
      });
      if (isSent) {
        return {
          sent: true
        }
      } else throw err(500, "mail can't be sent because the service is unavailable.");
      
    } catch(e) {
      console.log(e);
      withScope((scope) => {
        scope.setExtra("mailer send", e);
        captureException(e);
      });
      throw err(500, "mail can't be sent because of a fatal exception.");
    }
  }
}

export default Status;