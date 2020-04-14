import Adapter from "./adapter";
import { AllServices, AllServiceResults } from "model/all";

export class AllAdapters extends Adapter {
  adapt = (data: AllServices): AllServiceResults => ({
    infos: data[0],
    charts: data[1],
    events: {
      forthcoming: data[2],
      previous: data[3]
    },
    releases: data[4],
    tracks: data[5]
  });
}

export default AllAdapters;
