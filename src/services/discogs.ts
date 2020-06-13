import Service from "service";
import err from "err";
import { withScope, captureException } from "@sentry/node";
import Database from "lib/database";
import { ProfileModel } from "model/profile";
import { Models } from "model/models";
import {
  ReleasesByNameArgs,
  ReleasesByIdArgs,
  Release,
} from "model/releases";

export class Discogs extends Service {
  constructor(database: Database) {
    super(database);
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
        Models.releases
      );
      if (fromCache) return fromCache;
      
      const { content } = await this.fromDb<Release[]>(
        profile,
        Models.releases
      );
      if (!content) throw err(400, "no releases available");
      return content;
    } catch (err) {
      withScope((scope) => {
        scope.setExtra("getRelease", err);
        captureException(err);
      });
      throw err;
    }
  };
}

export default Discogs;
