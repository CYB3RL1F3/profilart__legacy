import config from "../config";
import Service from "../service";
import DiscogsAdapter from "../adapters/discogs";

export class Discogs extends Service {
  constructor(database) {
    super(database);
    this.adapter = new DiscogsAdapter();
  }

  getReleases = async profile => {
    try {
      const fromCache = this.cache.get(profile, "discogs", "releases");
      if (fromCache) return fromCache;
      const id = profile && profile.discogs && profile.discogs.artistId;
      const endpoint = `${config.api.discogs.api_url}/artists/${id}/releases`;
      const { releases } = await this.query(endpoint);

      let results = [];
      if (releases) {
        const partialResults = await Promise.all(
          releases.map(async release => {
            let infos = await this.query(release.resource_url);
            if (infos.main_release_url) {
              infos = await this.query(infos.main_release_url);
            }
            const adaptedRelease = await this.adapter.adaptRelease(
              release,
              infos
            );
            return adaptedRelease;
          })
        );
        partialResults.forEach(value => {
          if (
            !results.find(result => result.cat === value.cat) &&
            !results.find(result => result.title === value.title)
          ) {
            results.push(value);
          }
        });
      }
      await this.persist(profile, "releases", results);
      this.cache.set(profile, "discogs", "releases", results);
      return results;
    } catch (e) {
      try {
        return await this.fromDb(profile, "releases");
      } catch (err) {
        throw e;
      }
    }
  };

  query = url =>
    this.api.requestAndParseJSON({
      url: `${url}?key=${config.api.discogs.key}&secret=${
        config.api.discogs.secret
      }`,
      method: "GET",
      headers: {
        "User-Agent": "Profilart/1.0 +https://profilart.fr",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
}

export default Discogs;
