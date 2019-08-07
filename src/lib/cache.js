const NodeCache = require("node-cache");

export class Cache {
  nodeCache = {};
  constructor() {
    this.nodeCache = new NodeCache();
  }
  getKey = (profile, entry) => `prfl${profile.uid}_${entry}`;

  get(profile, service, entry) {
    const { cache } = profile;
    const key = this.getKey(profile, entry);
    if (!cache || !cache.use || !cache.ttl[service]) return false;
    return this.nodeCache.get(key);
  }
  set(profile, service, entry, value) {
    const { cache } = profile;
    if (
      cache.use &&
      cache.ttl &&
      cache.ttl[service] > 0 &&
      this.isSettable(value)
    ) {
      const key = this.getKey(profile, entry);
      return this.nodeCache.set(key, value, cache.ttl[entry]);
    }
    return false;
  }

  // choice done not to write in cache empty data
  isSettable(value) {
    if (value instanceof Array) return value.length > 0;
    if (value instanceof Object) return Object.keys(value).length > 0;
    return true;
  }
}

export default Cache;
