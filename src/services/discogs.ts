import config from "config";
import Service from "service";
import DiscogsAdapter from "adapters/discogs";
import err from "err";
import { withScope, captureException } from "@sentry/node";
import Database from "lib/database";
import { ProfileModel } from "model/profile";
import { Models } from "model/models";
import {
  ReleasesByNameArgs,
  ReleasesByIdArgs,
  Release,
  RawReleases,
  ReleaseInfo
} from "model/releases";

export class Discogs extends Service {
  adapter: DiscogsAdapter;
  constructor(database: Database) {
    super(database);
    this.adapter = new DiscogsAdapter();
  }

  getReleaseByName = async (
    profile: ProfileModel,
    args: ReleasesByNameArgs
  ) => {
    if (!(args && args.name)) throw err(400, "a name arg must be provided");

    const releases = await this.getReleases(profile);
    const release = releases.find(
      (release) => release.title.toLowerCase() === args.name.toLowerCase()
    );
    if (!release) throw err(404, "release not found");
    return release;
  };

  getReleaseById = async (
    profile: ProfileModel,
    args: ReleasesByIdArgs
  ): Promise<Release> => {
    if (!(args && args.id)) {
      if (args && args.name) return this.getReleaseByName(profile, args);
      throw err(400, "a name arg must be provided");
    }
    const releases = await this.getReleases(profile);
    const release = releases.find(
      (release) => parseInt(release.id, 10) === parseInt(args.id, 10)
    );
    if (!release) throw err(404, "release not found");
    return release;
  };

  getReleases = async (profile: ProfileModel): Promise<Release[]> => {
    try {
      
      const fromCache = this.cache.get<Release[]>(
        profile,
        "discogs",
        "releases"
      );
      if (fromCache) return fromCache;
      
      const id = profile && profile.discogs && profile.discogs.artistId;
      const endpoint = `${config.api.discogs.api_url}/artists/${id}/releases`;
      const { releases } = await this.query<RawReleases>(endpoint);

      let results: Release[] = [];
      if (releases) {
        const partialResults = await Promise.all(
          releases.map(async (release) => {
            if (!release || !release.resource_url) return null;
            if (
              (typeof release.role !== "undefined" && release.role.toLocaleLowerCase() === "appearance") || 
              (typeof release.format !== "undefined" && ( 
                release.format.toLocaleLowerCase().indexOf("mixed") > -1 ||
                release.format.toLocaleLowerCase().indexOf("comp") > -1
              ))
            ) return null;
            let infos = await this.query<ReleaseInfo>(release.resource_url);
            if (!infos) {
              console.log("Impossible to fetch infos for release => ", release.resource_url);
              return null;
            }
            const mainReleaseUrl = infos.main_release_url;
            if (mainReleaseUrl) {
              infos = await this.query<ReleaseInfo>(mainReleaseUrl);
            }
            if (!infos) {
              console.log('No infos fetched for main release url => ', mainReleaseUrl);
              return null;
            }
            const adaptedRelease = await this.adapter.adaptRelease(
              release,
              infos
            );
            return adaptedRelease;
          })
        );
        partialResults.forEach((release) => {
          if (release &&
            !results.find((result) => result.cat === release.cat) &&
            !results.find((result) => result.title === release.title)
          ) {
            results.push(release);
          }
        });
        await this.persist<Release[]>(profile, Models.releases, results);
        this.cache.set<Release[]>(profile, "discogs", Models.releases, results);
      }
      return results;
    } catch (e) {
      console.log(e);
      withScope((scope) => {
        scope.setExtra("getReleases", e);
        captureException(e);
      });
      try {
        const { content } = await this.fromDb<Release[]>(
          profile,
          Models.releases
        );
        return content;
      } catch (err) {
        withScope((scope) => {
          scope.setExtra("getRelease", err);
          captureException(err);
        });
        throw e;
      }
    }
  };

  query = async <T>(url: string) => {
    try {
      return await this.api.requestAndParseJSON<T>({
        url: `${url}?key=${config.api.discogs.key}&secret=${config.api.discogs.secret}`,
        method: "GET",
        headers: {
          "User-Agent": config.userAgent,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
    } catch(e) {
      withScope((scope) => {
          scope.setExtra("fail discogs query", url);
          captureException(e);
        });
      return null;
    }
  }
}

export default Discogs;
