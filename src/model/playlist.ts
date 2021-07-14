import { Data } from "lib/database/database.d";

export interface TrackInfo {
  id?: number;
  title?: string;
  genre?: string;
  description?: string;
  downloadable?: boolean;
  duration?: number;
  uri?: string;
  license?: string;
}

export interface Track extends TrackInfo {
  date?: string;
  artwork?: string;
  download?: string;
  soundcloud?: string;
  stats?: {
    count?: number;
    downloads?: number;
    favorites?: number;
  };
  duration?: number;
  uri?: string;
  url?: string;
  fullTitle?: string;
  taglist?: string[];
  waveform?: string;
  tracklist?: string[];
}

export interface PlaylistInfos {
  title: string;
  description: string;
  genre: string;
}

export interface PlaylistModel extends PlaylistInfos {
  taglist: string[];
  artwork: string;
  soundcloud: string;
  tracks: Track[];
  name: string;
}

export type Playlist = Data<PlaylistModel>;

export interface PlaylistArgs {
  name: string;
  tracklist?: boolean;
}

export interface RawTrack extends TrackInfo {
  created_at: string;
  artwork_url: string;
  download_url: string;
  permalink_url: string;
  waveform_url: string;
  tag_list: string;
  stream_url: string;
  playback_count: number;
  download_count: number;
  favoritings_count: number;
  display_date: string;
  media: {
    transcodings: Array<{
      url: string;
      duration: number;
    }>;
  };
}

export interface AudioRaw {
  stream_url: string;
}

export interface TrackInfoRaw {
  waveform_url: string;
}

export interface RawPlaylist extends PlaylistInfos {
  tag_list: string;
  artwork_url: string;
  permalink_url: string;
  tracks: RawTrack[];
}
