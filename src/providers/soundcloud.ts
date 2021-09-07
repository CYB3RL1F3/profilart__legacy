import config from "../config";
import SoundcloudAdapter from "../adapters/soundcloud";
import Service from "../service";
import err from "../err";
import Api from "../lib/api";
import Resolvers from "../lib/resolvers";
import { withScope, captureException } from "@sentry/node";
import { ProfileModel } from "model/profile";
import { Models } from "model/models";
import { TracksArgs } from "model/tracks";
import { MixesDB } from "lib/mixesdb";
import { InfosModel, SoundcloudInfosRaw } from "model/infos";
import {
  Track,
  PlaylistArgs,
  PlaylistModel,
  RawPlaylist,
  RawComments,
  RawLikes,
  RawTrack
} from "model/playlist";

interface OAuth2 {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: "";
  token_type: "bearer";
}

export const toQuery = (params?: Object) =>
  params
    ? `?${Object.keys(params)
        .map((key) => `${key}=${params[key]}`)
        .join("&")}`
    : "";

export class SoundcloudProvider extends Service {
  adapter: SoundcloudAdapter;
  token: string = null;
  refreshToken: string = null;
  api: Api = null;

  constructor(database) {
    super(database);
    this.adapter = new SoundcloudAdapter();
    this.api = new Api();
  }

  getToken = async () => {
    // https://api.soundcloud.com/oauth2/token
    const { clientId, clientSecret } = config.soundcloud;
    try {
      const oauth2 = await this.api.requestAndParseJSON<OAuth2>({
        url: "https://api.soundcloud.com/oauth2/token",
        method: "POST",
        headers: {
          "User-Agent": config.userAgent,
          accept: "application/json; charset=utf-8",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        form: {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials"
        }
      });
      this.token = oauth2.access_token;
      this.refreshToken = oauth2.refresh_token;

      return this.token;
    } catch (e) {
      console.log("ERRR ===> ", e);
    }
  };

  getHeaders = async () => {
    const token = await new Promise(async (resolve, reject) => {
      let t = this.token;
      if (t) resolve(t);
      else {
        t = await this.getToken();
        if (t) resolve(t);
        else reject("NO TOKEEENNN");
      }
    });
    return {
      "User-Agent": config.userAgent,
      "Content-Type": "application/json",
      Authorization: `OAuth ${token}`
    };
  };

  getCredentials = () => {
    const { clientId, clientSecret } = config.soundcloud;
    return `client_id=${clientId}&client_secret=${clientSecret}`;
  };

  runQuery = async <T>(
    endpoint: string,
    method: string = "GET",
    options = {}
  ) => {
    let headers;
    headers = await this.getHeaders();
    const separator = endpoint.indexOf("?") > -1 ? "&" : "?";
    const finalEndpoint = `${endpoint}${separator}${this.getCredentials()}`;
    const url = `https://api.soundcloud.com/${finalEndpoint}`;
    const res = await this.api.requestAndParseJSON<T>({
      url,
      method,
      headers,
      ...options
    });
    return res;
  };

  getComments = async (trackId: number): Promise<RawComments> => {
    const endpoint = `tracks/${trackId}/comments?limit=200&linked_partitioning=true`;
    try {
      return await this.runQuery<RawComments>(endpoint);
    } catch (e) {
      console.log("COMMENTS URL ===> ", endpoint);
      console.log("COMMENTS ERROR ==> ", e);
      return {
        collection: []
      };
    }
  };

  getLikes = async (trackId: number): Promise<RawLikes> => {
    const endpoint = `tracks/${trackId}/favoriters?limit=200&linked_partitioning=true`;

    try {
      return await this.runQuery<RawLikes>(endpoint);
    } catch (e) {
      console.log("LIKERS URL ==> ", endpoint);
      console.log("LIKES ERROR ==> ", e);
      return {
        collection: []
      };
    }
  };

  getTrack = (profile: ProfileModel, args: TracksArgs): Promise<Track> =>
    new Promise<Track>(async (resolve, reject) => {
      const { id } = args;
      if (!id) throw err(400, "id required");
      try {
        const endpoint = `tracks/${id}`;
        const res = await this.runQuery<RawTrack>(endpoint);
        res.comments = await this.getComments(res.id);
        res.likes = await this.getLikes(res.id);
        const track = this.adapter.adaptTrack(res);
        resolve(track);
      } catch (e) {
        reject(err(500, e.message || "error during payload construction"));
      }
    });

  getInfos = (profile: ProfileModel) =>
    new Promise<InfosModel>(async (resolve, reject) => {
      try {
        const endpoint = `/users/${profile.soundcloud.id}`;
        const res = await this.runQuery<SoundcloudInfosRaw>(endpoint);
        if (res) {
          let infos = this.adapter.adaptInfos(res);
          this.persist<InfosModel>(profile, Models.infos, infos).then(() => {
            resolve(infos);
          });
        } else {
          this.fromDb<InfosModel>(profile, Models.infos)
            .then((data) => {
              resolve(data.content);
            })
            .catch((e) => {
              if (e) reject(this.error(err(500, e.message || e)));
              else
                reject(
                  this.error(err(400, "request to soundcloud not completed..."))
                );
            });
        }
      } catch (e) {
        reject(e);
      }
    });

  error = (err, extra = null) => {
    withScope((scope) => {
      scope.setExtra("soundcloud", extra || err);
      captureException(err);
    });
    return err;
  };

  getTracks = (profile: ProfileModel) =>
    new Promise<Track[]>(async (resolve, reject) => {
      try {
        const endpoint = `users/${profile.soundcloud.id}/tracks`;
        const res = await this.runQuery<RawTrack[]>(endpoint);
        if (res && res.length) {
          const updatedTracks = await Promise.all<RawTrack>(
            res.map(async (track: RawTrack) => ({
              ...track,
              comments: await this.getComments(track.id),
              likes: await this.getLikes(track.id)
            }))
          );
          let tracks = this.adapter.adapt(updatedTracks);
          this.persist<Track[]>(profile, Models.tracks, tracks).then(() => {
            this.cache.set<Track[]>(
              profile,
              "soundcloud",
              Models.tracks,
              tracks
            );
            resolve(tracks);
          });
        } else {
          if (res && res.length === 0) resolve([]);
          else
            reject(
              this.error(err(500, "request to soundcloud not completed..."))
            );
        }
      } catch (e) {
        reject(
          this.error(
            err(500, e.message || e || "request to soundcloud not completed...")
          )
        );
      }
    });

  getTracklist = async (artistName: string, soundcloudUrl: string) => {
    const mixesDb = new MixesDB();
    return await mixesDb.getTracklist(artistName, soundcloudUrl);
  };

  getPlaylist = async (
    profile: ProfileModel,
    args: PlaylistArgs
  ): Promise<PlaylistModel> => {
    const { name } = args;
    if (!name) throw err(400, "missing playlist url fragment in query");
    const playlistKey = Models[`playlist_${name}`];
    const resolver = new Resolvers();
    const resolvedUrl = resolver.resolvePlaylistUrl(profile, name);
    let res: RawPlaylist;
    let error = null;
    try {
      res = await this.runQuery<RawPlaylist>(resolvedUrl);
    } catch (e) {
      console.log(e);
      error = e;
    }
    if (res && !error) {
      try {
        const rawPlaylist = {
          ...res,
          tracks: await Promise.all(
            res.tracks.map(async (track: RawTrack) => {
              const [tracklist, comments, likes] = await Promise.all([
                this.getTracklist(profile.artistName, track.permalink_url),
                this.getComments(track.id),
                this.getLikes(track.id)
              ]);
              return {
                ...track,
                tracklist,
                comments,
                likes
              };
            })
          )
        };
        const playlist = this.adapter.adaptPlaylist(
          rawPlaylist,
          profile.artistName
        );

        await this.persist<PlaylistModel>(profile, playlistKey, playlist);
        this.cache.set<PlaylistModel>(
          profile,
          "soundcloud",
          playlistKey,
          playlist
        );
        return playlist;
      } catch (e) {
        console.log("ERROR", e);
        this.error(
          err(500, e.message || "an error occured : database's unavailable")
        );
        return null;
      }
    } else {
      if (error) {
        this.error(err(400, error));
        return null;
      } else if (res && res.tracks.length === 0)
        return this.adapter.adaptPlaylist(res, profile.artistName);
      else {
        this.error(err(500, "request to soundcloud not completed..."));
        return null;
      }
    }
  };
}

export default SoundcloudProvider;
