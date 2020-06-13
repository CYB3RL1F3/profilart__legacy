import Api from "./lib/api";
import Cache from "./lib/cache";
import Database from "./lib/database/database";
import { ProfileModel } from "model/profile";
import { Models } from "model/models";
import Adapter from "adapters/adapter";
import { Data } from "lib/database/database.d";
import { FindAndModifyWriteOpResultObject } from "mongodb";

export class Service {
  api: Api;
  adapter: Adapter;
  cache: Cache;

  persist = <Coll>(
    profile,
    key: Models,
    value: Coll
  ): Promise<FindAndModifyWriteOpResultObject<Data<Coll>>> =>
    this.isPersistable<Coll>(value) &&
    this.database.persist<Coll>(profile.uid, key, value);

  fromDb = <Coll>(profile: ProfileModel, key: Models): Promise<Data<Coll>> =>
    this.database.select<Coll>(profile.uid, key);

  isPersistable<Value>(value: Value | Value[]) {
    // if (value instanceof Array) return value.length > 0;
    // if (value instanceof Object) return Object.keys(value).length > 0;
    return true;
  }

  constructor(readonly database: Database) {
    this.api = new Api();
    this.cache = new Cache();
  }
}

export default Service;
