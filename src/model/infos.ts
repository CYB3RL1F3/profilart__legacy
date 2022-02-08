import { Data } from "lib/database/database.d";

export interface Label {
  name: string;
  image: string;
  RA: string;
}

export interface Bio {
  intro: string;
  content: string;
}

export interface InfosModel {
  name?: string;
  realname?: string;
  country?: string;
  labels?: Label[];
  website?: string;
  RA?: string;
  facebook?: string;
  twitter?: string;
  discogs?: string;
  soundcloud?: string;
  followers?: number;
  aliases?: string;
  bookingDetails?: string;
  picture?: string;
  bio?: Bio;
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
