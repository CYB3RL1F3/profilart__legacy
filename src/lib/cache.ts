import NodeCache from "node-cache";
import { ProfileModel } from "model/profile";

export class Cache {
  nodeCache: NodeCache;
  constructor() {
    this.nodeCache = new NodeCache();
  }
  getKey = (profile: ProfileModel, entry: string) =>
    `prfl${profile.uid}_${entry}`;

  get<T>(profile: ProfileModel, service: string, entry: string) {
    const { cache } = profile;
    const key = this.getKey(profile, entry);
    if (!cache || !cache.use || !cache.ttl[service]) return false;
    const response = this.nodeCache.get<T>(key);
    return response;
  }
  set<T>(profile: ProfileModel, service: string, entry: string, value: T) {
    const { cache } = profile;
    if (
      cache &&
      cache.use &&
      cache.ttl &&
      cache.ttl[service] > 0 &&
      this.isSettable<T>(value)
    ) {
      const key = this.getKey(profile, entry);
      return this.nodeCache.set<T>(key, value, cache.ttl[entry]);
    }
    return false;
  }

  // choice done not to write in cache empty data
  isSettable<T>(value: T) {
    if (value instanceof Array) return value.length > 0;
    if (value instanceof Object) return Object.keys(value).length > 0;
    return true;
  }
}

export default Cache;
