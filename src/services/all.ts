import Service from "../service";
import AllAdapters from "../adapters/all";
import Database from "lib/database";
import { ResidentAdvisor } from "./residentadvisor";
import { Discogs } from "./discogs";
import { Soundcloud } from "./soundcloud";
import { AllServices, AllServicesArray, AllServiceResults } from "model/all";
import { ProfileModel } from "model/profile";

export class All extends Service {
  residentAdvisor: ResidentAdvisor;
  discogs: Discogs;
  adapter: AllAdapters;
  soundcloud: Soundcloud;

  constructor(
    database: Database,
    residentAdvisor: ResidentAdvisor,
    discogs: Discogs,
    soundcloud: Soundcloud
  ) {
    super(database);
    this.residentAdvisor = residentAdvisor;
    this.discogs = discogs;
    this.soundcloud = soundcloud;
    this.adapter = new AllAdapters();
  }

  get = async (profile: ProfileModel): Promise<AllServiceResults> => {
    const services: AllServicesArray = [
      this.residentAdvisor.getInfos(profile),
      this.residentAdvisor.getCharts(profile),
      this.residentAdvisor.getEvents(profile, { type: 1 }),
      this.residentAdvisor.getEvents(profile, { type: 2 }),
      this.discogs.getReleases(profile),
      this.soundcloud.getTracks(profile)
    ];
    const results: AllServices = await Promise.all<
      AllServices[0],
      AllServices[1],
      AllServices[2],
      AllServices[3],
      AllServices[4],
      AllServices[5]
    >(services);
    return this.adapter.adapt(results);
  };
}

export default All;
