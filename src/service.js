import Api from "./lib/api";
import Cache from "./lib/cache";

export class Service {
  api = {};
  database = {};
  adapter = {};
  cache = {};

  persist = (profile, key, value) =>
    this.isPersistable(value) && this.database.persist(profile.uid, key, value);

  fromDb = (profile, key) => this.database.select(profile.uid, key);

  isPersistable(value) {
    if (value instanceof Array) return value.length > 0;
    if (value instanceof Object) return Object.keys(value).length > 0;
    return true;
  }

  constructor(database) {
    this.api = new Api();
    this.database = database;
    this.cache = new Cache();
  }
}

export default Service;
