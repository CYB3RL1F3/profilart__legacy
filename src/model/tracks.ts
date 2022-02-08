import { Data } from "lib/database/database.d";

interface User {
  id: number;
  kind: string;
  permalink: string;
  username: string;
  last_modified: string;
  uri: string;
  permalink_url: string;
  avatar_url: string;
}

export interface Track {
  kind: string;
  id: number;
  created_at: string;
  user_id: number;
  duration: number;
  commentable: true;
  state: string;
  original_content_size: number;
  last_modified: string;
  sharing: string;
  tag_list: string;
  permalink: string;
  streamable: true;
  embeddable_by: string;
  purchase_url: null;
  purchase_title: null;
  label_id: null;
  genre: string;
  title: string;
  description: string;
  label_name: null;
  release: null;
  track_type: null;
  key_signature: null;
  isrc: null;
  video_url: null;
  bpm: null;
  release_year: null;
  release_month: null;
  release_day: null;
  original_format: string;
  license: string;
  uri: string;
  user: User;
  permalink_url: string;
  artwork_url: string;
  stream_url: string;
  download_url: string;
  playback_count: number;
  download_count: number;
  favoritings_count: number;
  reposts_count: number;
  comment_count: number;
  downloadable: false;
  waveform_url: string;
  attachments_uri: string;
}

export type Tracks = Data<Track[]>;

export interface TracksArgs {
  id: number;
}

export interface StreamArgs extends TracksArgs {
  isDownload: boolean;
}