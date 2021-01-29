import { Data } from "lib/database/database.d";

export interface InfosModel {
  name?: string;
  realname?: string;
  country?: string;
  labels?: string[];
  website?: string;
  RA?: string;
  facebook?: string;
  twitter?: string;
  discogs?: string;
  soundcloud?: string;
  followers?: string;
  picture?: string;
  bio?: {
    intro?: string;
    content?: string;
  };
}

export type Infos = Data<InfosModel>;

export interface InfosRaw {
  artist: Array<{
    artistname: string[];
    realname: string[];
    countryname: string[];
    labels: string[];
    website: string[];
    raprofile: string[];
    facebook: string[];
    twitter: string[];
    discogs: string[];
    soundcloud: string[];
    profileimage: string[];
    bio: string[];
    biointro: string[];
  }>;
}

export interface SoundcloudInfosRaw {
  username: string;
  full_name: string;
  country: string;
  website: string;
  permalink_url: string;
  discogs_name: string;
  avatar_url: string;
  description: string;
}
