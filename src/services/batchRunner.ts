import { Batch, BatchArgs } from "./batch";
import { ResidentAdvisorProvider } from '../providers/residentadvisor';
import { SoundcloudProvider } from '../providers/soundcloud';
import { DiscogsProvider } from '../providers/discogs';
import Database from "lib/database";
import { ProfileModel } from 'model/profile';
import { AllServiceResults } from "model/all";
import err from "err";
import scheduler from "node-schedule";
import https from "https";
import config from "config";
import Resolvers from "lib/resolvers";

export class BatchRunner {
  batch: Batch;
  constructor(readonly database: Database) {
    const residentAdvisorProvider: ResidentAdvisorProvider =
      new ResidentAdvisorProvider(database);
    const soundcloudProvider: SoundcloudProvider = new SoundcloudProvider(
      database
    );
    const discogsProvider: DiscogsProvider = new DiscogsProvider(database);
    this.batch = new Batch(
      database,
      residentAdvisorProvider,
      soundcloudProvider,
      discogsProvider
    );
  }

  start = () => {
    if (!config.batches.enabled) return;
    scheduler.scheduleJob("0 0 */6 ? * *", async () => {
      const resolver = new Resolvers();
      await Promise.all(
        new Array(config.api.discogs.nbProxies).fill("*").map(async (e, i) => {
          return await https.get(resolver.getDiscogsProxyUrl(i));
        })
      );

      this.run();
    });
  };

  run = async () => await this.batch.run();

  reset = async (
    profile: ProfileModel,
    args?: BatchArgs
  ): Promise<AllServiceResults> => {
    if (!profile) throw new Error("Autheticated profile required");
    try {
      return await this.batch.get(profile, args);
    } catch (e) {
      throw err(400, e.message || e);
    }
  };
}