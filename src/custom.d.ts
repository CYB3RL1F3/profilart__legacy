declare namespace Express {
  // @ts-ignore
  import { Redis } from "redis";
  export interface Request {
    store?: Redis.RedisClient;
  }
}
