import config from "config";
import Api from "lib/api";
import {
  Track,
  PlaylistModel,
  RawTrack,
  RawPlaylist,
  TrackInfoRaw,
  AudioRaw,
  Comment,
  Like,
  RawComments,
  RawLikes
} from "model/playlist";

import { InfosModel, SoundcloudInfosRaw } from "model/infos";
export class SoundcloudAdapter {
  clientQS = `?client_id=${config.soundcloud.clientId}`;

  resolveStream = (track: RawTrack) =>
    `https://api.soundcloud.com/tracks/${track.id}/stream${this.clientQS}`;

  adaptComments = (res: RawComments): Comment[] =>
    res.collection.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.created_at,
      timestamp: comment.timestamp,
      user: comment.user && {
        id: comment.user.id,
        avatar:
          comment.user.avatar_url &&
          comment.user.avatar_url.replace("large", "t500x500"),
        firstName: comment.user.first_name,
        lastName: comment.user.last_name,
        fullName: comment.user.full_name,
        followers: comment.user.followers_count,
        soundcloud: comment.user.permalink_url,
        uri: comment.user.uri,
        urn: comment.user.urn,
        username: comment.user.username,
        verified: comment.user.verified,
        city: comment.user.city,
        country: comment.user.country_code
      }
    }));

  adaptLikes = (res: RawLikes): Like[] =>
    res.collection.map((like) => ({
      createdAt: like.created_at,
      id: like.id,
      avatar: like.avatar_url && like.avatar_url.replace("large", "t500x500"),
      firstName: like.first_name,
      lastName: like.last_name,
      fullName: like.full_name,
      followers: like.followers_count,
      soundcloud: like.permalink_url,
      uri: like.uri,
      urn: like.urn,
      username: like.username,
      verified: like.verified,
      city: like.city,
      country: like.country_code
    }));

  adaptTrack = (track: RawTrack): Track => {
    const keys = ["uri", "stream_url", "download_url", "attachments_uri"];
    keys.forEach((key) => {
      track[key] = track[key] ? `${track[key]}${this.clientQS}` : null;
    });
    let comments: Comment[] = this.adaptComments(track.comments);
    let likes: Like[] = this.adaptLikes(track.likes);

    return {
      id: track.id,
      title: track.title,
      date: track.created_at,
      genre: track.genre,
      artwork:
        track.artwork_url && track.artwork_url.replace("large", "t500x500"),
      description: track.description,
      download: track.download_url,
      downloadable: track.downloadable,
      soundcloud: track.permalink_url,
      duration: track.duration,
      waveform: track.waveform_url,
      tracklist: track.tracklist,
      taglist: this.extractTagList(track.tag_list),
      uri: track.uri,
      url: track.stream_url,
      license: track.license,
      stats: {
        count: track.playback_count,
        downloads: track.download_count,
        favorites: track.favoritings_count
      },
      comments,
      likes
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
      artwork:
        track.artwork_url && track.artwork_url.replace("large", "t500x500"),
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
    return tagList
      .split(" ")
      .reduce<string[]>((acc, content) => {
        const data = content.replace('"', "");
        if (bypass) {
          acc[acc.length - 1] += ` ${data}`;
          bypass = content.indexOf('"') === -1;
        } else {
          acc.push(data);
          bypass = content.indexOf('"') > -1;
        }

        return acc;
      }, [])
      .filter((t) => t);
  };

  adaptPlaylist = (playlist: RawPlaylist, name: string): PlaylistModel => {
    const tracks = playlist.tracks.map((track) => this.adaptTrack(track));
    return {
      title: playlist.title,
      description: playlist.description,
      genre: playlist.genre,
      taglist: this.extractTagList(playlist.tag_list),
      artwork:
        playlist.artwork_url &&
        playlist.artwork_url.replace("large", "t500x500"),
      soundcloud: playlist.permalink_url,
      name,
      tracks
    };
  };

  adapt = (data: RawTrack[]): Track[] =>
    data.map((track) => this.adaptTrack(track));
}

export default SoundcloudAdapter;
