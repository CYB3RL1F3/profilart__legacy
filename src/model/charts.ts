import { Data } from "lib/database/database.d";

export interface Track {
  id?: string;
  artist?: string;
  title?: string;
  label?: string;
  remix?: string;
  cover?: string;
  RA_link?: string;
}

export interface ChartsModel {
  id?: string;
  date?: string;
  rank?: string;
  tracks?: Track[];
}

export type Charts = Data<ChartsModel[]>;

export type TypeOptionQuery = "1" | "2";

export interface ChartsQuery {
  DJID: string;
  Option: TypeOptionQuery;
  UserID: string;
  AccessKey: string;
  ChartID: string;
}

export interface ChartsQueryArgs {
  option: TypeOptionQuery;
}

export interface ChartRaw {
  track: Array<{
    chartid: string[];
    chartdate: string[];
    rank: string[];
    trackid: string[];
    artist: string[];
    title: string[];
    label: string[];
    mix: string[];
    cover: string[];
    tracklink: string[];
  }>;
}

export interface ChartsRaw {
  charts: ChartRaw[];
}
