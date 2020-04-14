import { InfosModel } from "./infos";
import { ChartsModel } from "./charts";
import { EventModel } from "./events";
import { Release } from "./releases";
import { Track } from "./playlist";

export type AllServices = [
  InfosModel,
  ChartsModel[],
  EventModel[],
  EventModel[],
  Release[],
  Track[]
];
export type AllServicesArray = [
  Promise<InfosModel>,
  Promise<ChartsModel[]>,
  Promise<EventModel[]>,
  Promise<EventModel[]>,
  Promise<Release[]>,
  Promise<Track[]>
];

export interface AllServiceResults {
  infos: InfosModel;
  charts: ChartsModel[];
  events: {
    forthcoming: EventModel[];
    previous: EventModel[];
  };
  releases: Release[];
  tracks: Track[];
}
