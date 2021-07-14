import Service from "../service";
import Database from "lib/database";
import { ResidentAdvisorProvider } from "../providers/residentadvisor";
import { DiscogsProvider } from "../providers/discogs";
import { SoundcloudProvider } from "../providers/soundcloud";
import { AllServices, AllServicesArray, AllServiceResults } from "model/all";
import { ProfileModel } from "model/profile";
import AllAdapters from "adapters/all";
import { EventArgs } from "model/events";
import { PlaylistArgs } from 'model/playlist';
const { IncomingWebhook } = require('@slack/webhook');

export interface BatchArgs extends PlaylistArgs {}

export class Batch extends Service {
  adapter: AllAdapters;
  webhook;
  constructor(
    database: Database,
    readonly residentAdvisor: ResidentAdvisorProvider,
    readonly soundcloud: SoundcloudProvider,
    readonly discogs: DiscogsProvider
  ) {
    super(database);
    this.adapter = new AllAdapters();

    // Read a url from the environment variables
    const url = process.env.SLACK_WEBHOOK_URL;

    // Initialize
    this.webhook = new IncomingWebhook(url);
  }

  getInfos = (profile: ProfileModel) => this.residentAdvisor.getInfos(profile);
  getCharts = (profile: ProfileModel) =>
    this.residentAdvisor.getCharts(profile);

  getEvents = (profile: ProfileModel, args: EventArgs) =>
    this.residentAdvisor.getEvents(profile, args);
  getReleases = (profile: ProfileModel) => this.discogs.getReleases(profile);
  getTracks = (profile: ProfileModel) => this.soundcloud.getTracks(profile);
  getPlaylist = (profile: ProfileModel, args: PlaylistArgs) =>
    this.soundcloud.getPlaylist(profile, args);

  canRunResidentAdvisor = (profile: ProfileModel) =>
    !!profile.residentAdvisor &&
    !!profile.residentAdvisor.DJID &&
    !!profile.residentAdvisor.userId &&
    !!profile.residentAdvisor.userId;
  canRunDiscogs = (profile: ProfileModel) =>
    !!profile.discogs && !!profile.discogs.artistId;
  canRunSoundcloud = (profile: ProfileModel) =>
    !!profile.soundcloud && !!profile.soundcloud.id;

  get = async (
    profile: ProfileModel,
    args?: BatchArgs
  ): Promise<AllServiceResults> => {
    const playlists =
      (profile.soundcloud && profile.soundcloud.playlists) || [];
    const soundcloudPlaylists = await Promise.all(
      playlists
        .filter((n) => !!n)
        .map(
          async (name) =>
            await this.soundcloud.getPlaylist(profile, {
              name,
              ...args
            })
        )
    );

    const services: AllServicesArray = [
      this.canRunResidentAdvisor(profile)
        ? this.residentAdvisor.getInfos(profile)
        : Promise.resolve(null),
      this.canRunResidentAdvisor(profile)
        ? this.residentAdvisor.getCharts(profile)
        : Promise.resolve(null),
      this.canRunResidentAdvisor(profile)
        ? this.residentAdvisor.getEvents(profile, { type: 1 })
        : Promise.resolve(null),
      this.canRunResidentAdvisor(profile)
        ? this.residentAdvisor.getEvents(profile, { type: 2 })
        : Promise.resolve(null),
      this.canRunDiscogs(profile)
        ? this.discogs.getReleases(profile)
        : Promise.resolve(null),
      this.canRunSoundcloud(profile)
        ? this.soundcloud.getTracks(profile)
        : Promise.resolve(null)
    ];
    const results: AllServices = await Promise.all<
      AllServices[0],
      AllServices[1],
      AllServices[2],
      AllServices[3],
      AllServices[4],
      AllServices[5]
    >(services);

    const res = this.adapter.adapt(results);
    res.playlists = soundcloudPlaylists.reduce((acc, v, i) => {
      if (v)
        return {
          ...acc,
          [`${v.name}`]: v
        };
      return acc;
    }, {});
    return res;
  };

  getAllProfiles = async () => {
    const profiles = await this.database.findAll<ProfileModel>({}, "profiles");
    return profiles.map((p) => p.content);
  };

  run = async () => {
    console.log("start batch");
    try {
      const profiles = await this.getAllProfiles();
      let success = true;
      await Promise.all(
        profiles.map(async (profile) => {
          try {
            const p = await this.get(profile);
            return p;
          } catch (e) {
            success = false;
            console.log(e);
            await this.webhook.send({
              text: `/!\\ *A FATAL ERROR OCCURED* while fetching data of profile *${
                profile.uid
              }*\n\n${e.message || e}`
            });
            return null;
          }
        })
      );
      if (success) {
        console.log("Batch run with success!");
        await this.webhook.send({
          text: `Batch run with success!`
        });
      }
    } catch (e) {
      console.log("FATAL ERROR ", e);
      await this.webhook.send({
        text: `/!\\ *A FATAL ERROR OCCURED* while fetching datas...\n\n${
          e.message || e
        }`
      });
    }
  };
}