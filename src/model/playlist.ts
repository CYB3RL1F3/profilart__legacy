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
  comments?: Comment[];
  likes?: Like[];
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
  comments?: RawComments;
  likes?: RawLikes;
  tracklist?: any;
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

/////// ::::::

export interface Self {
  urn: string;
}

export interface Badges {
  pro: boolean;
  pro_unlimited: boolean;
  verified: boolean;
}

export interface SoundcloudUserRaw {
  avatar_url: string;
  first_name: string;
  followers_count: number;
  full_name: string;
  id: number;
  kind: string;
  last_modified: Date;
  last_name: string;
  permalink: string;
  permalink_url: string;
  uri: string;
  urn: string;
  username: string;
  verified: boolean;
  city: string;
  country_code: string;
  badges: Badges;
  station_urn: string;
  station_permalink: string;
}

export interface SoundcloudUser {
  avatar: string;
  firstName: string;
  followers: number;
  fullName: string;
  id: number;
  lastName: string;
  soundcloud: string;
  uri: string;
  urn: string;
  username: string;
  verified: boolean;
  city: string;
  country: string;
}

export interface RawComment {
  kind: string;
  id: number;
  body: string;
  created_at: Date;
  timestamp: number;
  track_id: number;
  user_id: number;
  self: Self;
  user: SoundcloudUserRaw;
}

export interface RawComments {
  collection: RawComment[];
  next_href?: any;
  query_urn?: any;
}

export interface Comment {
  id: number;
  body: string;
  createdAt: Date;
  timestamp: number;
  user: SoundcloudUser;
}

export interface RawLike extends SoundcloudUserRaw {
  created_at: Date;
}

export interface Like extends SoundcloudUser {
  createdAt: Date;
}

export interface RawLikes {
  collection: RawLike[];
}