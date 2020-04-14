import { Data } from "lib/database/database.d";
import { Track } from "./playlist";

export interface Artist {
  name?: string;
  role?: string;
}

export interface RawTracklist {
  title?: string;
  duration?: string;
  position?: string;
  artists?: Artist[];
  extraartists?: Artist[];
}

export interface ReleaseTrack extends RawTracklist {
  fullTitle?: string;
  stream?: Track;
}

export interface DiscogsRelease {
  label?: string;
  thumb?: string;
  artist?: string;
  role?: string;
  year?: number;
  resource_url?: string;
  type?: string;
  id?: string;
  title?: string;
}

export interface Release extends DiscogsRelease {
  stats?: {
    community?: {
      in_collection?: number;
      in_wantlist?: number;
    };
  };
  main_release?: number;
  images?: string[];
  releaseDate?: string;
  cat?: string;
  tracklist?: ReleaseTrack[];
  notes?: string;
  discogs?: string;
  styles?: string[];
}

export type Releases = Data<Release[]>;

export interface ReleasesByNameArgs {
  name: string;
}

export interface ReleasesByIdArgs {
  id: string;
  name: string;
}

export interface RawLabel {
  name: string;
  catno: string;
  cat: string;
}

export interface Image {
  uri: string;
}

export interface RawReleases {
  releases: DiscogsRelease[];
}

export interface ReleaseInfo {
  labels: RawLabel[];
  resource_url: string;
  main_release_url: string;
  released: string;
  notes?: string;
  images: Image[];
  uri?: string;
  styles?: string[];
  tracklist: RawTracklist[];
}
