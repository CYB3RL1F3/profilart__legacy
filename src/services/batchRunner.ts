import { Batch } from "./batch";
import { ResidentAdvisorProvider } from '../providers/residentadvisor';
import { SoundcloudProvider } from '../providers/soundcloud';
import { DiscogsProvider } from '../providers/discogs';
import Database from "lib/database";
import { ProfileModel } from 'model/profile';
import { AllServiceResults } from "model/all";
import err from "err";
import scheduler from "node-schedule";
import config from "config";

export class BatchRunner {
  batch: Batch;
  constructor(readonly database: Database) {
    const residentAdvisorProvider: ResidentAdvisorProvider = new ResidentAdvisorProvider(database);
    const soundcloudProvider: SoundcloudProvider = new SoundcloudProvider(database);
    const discogsProvider: DiscogsProvider = new DiscogsProvider(database);
    this.batch = new Batch(database, residentAdvisorProvider, soundcloudProvider, discogsProvider);
  }

  start = () => {
    if (!config.batches.enabled) return;
    this.run();
    scheduler.scheduleJob('0 0 */2 ? * *', () => {
      this.run();
    });
  }

  run = async () => await this.batch.run()

  reset = async (profile: ProfileModel): Promise<AllServiceResults> => {
    if (!profile) throw new Error('Autheticated profile required');
    try {
      return await this.batch.get(profile);
    } catch(e) {
      throw err(400, e.message || e);
    }
  }
}