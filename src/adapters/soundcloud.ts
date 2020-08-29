import config from "config";
import Api from "lib/api";
import {
  Track,
  PlaylistModel,
  RawTrack,
  RawPlaylist,
  TrackInfoRaw,
  AudioRaw
} from "model/playlist";
import { InfosModel, SoundcloudInfosRaw } from "model/infos";
export class SoundcloudAdapter {
  clientQS = `?client_id=${config.soundcloud.clientId}`;

  resolveStream = (track: Track) =>
    `https://api.soundcloud.com/tracks/${track.id}/stream${this.clientQS}`;

  adaptTrack = (track: RawTrack): Track => {
    const keys = ["uri", "stream_url", "download_url", "attachments_uri"];
    keys.forEach((key) => {
      track[key] = track[key] ? `${track[key]}${this.clientQS}` : null;
    });
    return {
      id: track.id,
      title: track.title,
      date: track.created_at,
      genre: track.genre,
      artwork: track.artwork_url && track.artwork_url.replace('large', 't500x500'),
      description: track.description,
      download: track.download_url,
      downloadable: track.downloadable,
      soundcloud: track.permalink_url,
      duration: track.duration,
      waveform: track.waveform_url,
      taglist: this.extractTagList(track.tag_list),
      uri: track.uri,
      url: track.stream_url,
      license: track.license,
      stats: {
        count: track.playback_count,
        downloads: track.download_count,
        favorites: track.favoritings_count
      }
    };
  };

  adaptPlaylistTrack = async (track: RawTrack): Promise<Track> => {
    const source = track.media.transcodings[1];
    const api = new Api();
    const audio = await api.requestAndParseJSON<AudioRaw>({
      url: `${source.url}?client_id=${config.soundcloud.clientId}`,
      method: "GET",
      headers: {
        "User-Agent": config.userAgent,
        "Content-Type": "application/json"
      }
    });
    const trackInfos = await api.requestAndParseJSON<TrackInfoRaw>({
      url: `${track.uri}?client_id=${config.soundcloud.clientId}`,
      method: "GET",
      headers: {
        "User-Agent": config.userAgent,
        "Content-Type": "application/json"
      }
    });
    const keys = ["permalink_url", "download_url"];

    keys.forEach((key) => {
      track[key] = `${track[key]}${this.clientQS}`;
    });
    return {
      id: track.id,
      title: track.title,
      date: track.display_date,
      artwork: track.artwork_url && track.artwork_url.replace('large', 't500x500'),
      description: track.description,
      download: track.download_url,
      downloadable: track.downloadable,
      soundcloud: track.permalink_url,
      genre: track.genre,
      license: track.license,
      stats: {
        count: track.playback_count,
        downloads: track.download_count,
        favorites: track.favoritings_count
      },
      duration: source.duration,
      uri: audio.stream_url,
      url: this.resolveStream(track),
      taglist: this.extractTagList(track.tag_list),
      waveform: trackInfos.waveform_url
    };
  };

  adaptInfos = (data: SoundcloudInfosRaw): InfosModel => {
    return {
      name: data.username,
      realname: data.full_name,
      country: data.country,
      labels: [],
      website: data.website,
      RA: "",
      facebook: "",
      twitter: "",
      discogs: `https://discogs.com/artist/${data.discogs_name}`,
      soundcloud: data.permalink_url,
      picture: data.avatar_url,
      bio: {
        intro: "",
        content: data.description
      }
    };
  };

  extractTagList = (tagList: string): string[] => {
    let bypass = false;
    return tagList.split(" ").reduce<string[]>((acc, content) => {
      const data = content.replace('"', "");
      if (bypass) {
        acc[acc.length - 1] += ` ${data}`;
        bypass = content.indexOf('"') === -1;
      } else {
        acc.push(data);
        bypass = content.indexOf('"') > -1;
      }

      return acc;
    }, []);
  };

  adaptPlaylist = async (playlist: RawPlaylist, name: string): Promise<PlaylistModel> => {
    const tracks = await Promise.all<Track>(
      playlist.tracks.map(async (track) => await this.adaptTrack(track))
    );
    return {
      title: playlist.title,
      description: playlist.description,
      genre: playlist.genre,
      taglist: this.extractTagList(playlist.tag_list),
      artwork: playlist.artwork_url && playlist.artwork_url.replace('large', 't500x500'),
      soundcloud: playlist.permalink_url,
      name,
      tracks
    };
  };

  adapt = (data: RawTrack[]): Track[] =>
    data.map((track) => this.adaptTrack(track));
}

export default SoundcloudAdapter;
