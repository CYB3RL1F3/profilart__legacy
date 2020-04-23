import SC from "node-soundcloud";
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
import {
  Track,
  PlaylistArgs,
  PlaylistModel,
  RawPlaylist
} from "model/playlist";
import { InfosModel, SoundcloudInfosRaw } from "model/infos";

export class Soundcloud extends Service {
  adapter: SoundcloudAdapter;
  constructor(database) {
    super(database);
    this.adapter = new SoundcloudAdapter();
    SC.init({
      id: config.soundcloud.clientId,
      secret: config.soundcloud.clientSecret
    });
  }

  getTrack = (profile: ProfileModel, args: TracksArgs): Promise<Track> =>
    new Promise<Track>((resolve, reject) => {
      const { id } = args;
      if (!id) throw err(400, "id required");
      SC.get(`/tracks/${id}`, (error, res) => {
        if (res && !error) {
          try {
            const track = this.adapter.adaptTrack(res);
            resolve(track);
          } catch (e) {
            reject(
              this.error(
                err(500, e.message || "error during payload construction")
              )
            );
          }
        } else {
          this.fromDb<Track[]>(profile, Models.tracks)
            .then((data) => {
              const track = data.content.find((v) => v.id === id);
              if (track) {
                resolve(track);
              } else {
                reject(err(400, "track not found"));
              }
            })
            .catch((e) => {
              reject(this.error(err(500, e.message || "an error occured")));
            });
        }
      });
    });

  getInfos = (profile: ProfileModel) =>
    new Promise<InfosModel>((resolve, reject) => {
      SC.get(
        `/users/${profile.soundcloud.id}`,
        (error, res: SoundcloudInfosRaw) => {
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
                if (error) reject(this.error(err(400, error)));
                else if (e) reject(this.error(err(500, e.message || e)));
                else
                  reject(
                    this.error(
                      err(400, "request to soundcloud not completed...")
                    )
                  );
              });
          }
        }
      );
    });

  error = (err, extra = null) => {
    withScope((scope) => {
      scope.setExtra("soundcloud", extra || err);
      captureException(err);
    });
    return err;
  };

  getTracks = (profile: ProfileModel) =>
    new Promise<Track[]>((resolve, reject) => {
      try {
        const fromCache = this.cache.get<Track[]>(profile, "soundcloud", "tracks");
        if (fromCache) return resolve(fromCache);
      } catch(e) {
        
      }
      SC.get(`/users/${profile.soundcloud.id}/tracks`, (error, res) => {
        console.log(error, res);
        if (res) {
          let tracks = this.adapter.adapt(res);
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
          this.fromDb<Track[]>(profile, Models.tracks)
            .then((data) => {
              resolve(data.content);
            })
            .catch((e) => {
              console.log(e);
              if (error) reject(this.error(err(400, error)));
              else if (e) reject(this.error(err(500, e.message || e)));
              else reject(this.error(err(400, "request to soundcloud not completed...")));
            });
        }
      });
    });

  getPlaylist = async (
    profile: ProfileModel,
    args: PlaylistArgs
  ): Promise<PlaylistModel> => {
    const { name } = args;
    if (!name) throw err(400, "missing playlist url fragment in query");
    const playlistKey = Models[`playlist_${name}`];
    const fromCache = this.cache.get<PlaylistModel>(
      profile,
      "soundcloud",
      playlistKey
    );
    if (fromCache) return fromCache;

    const resolver = new Resolvers();
    const api = new Api();
    const resolvedUrl = resolver.resolvePlaylistUrl(profile, name);
    let res;
    try {
      res = await api.requestAndParseJSON<RawPlaylist>({
        url: resolvedUrl,
        method: "GET",
        headers: {
          "User-Agent": config.userAgent,
          "Content-Type": "application/json"
        }
      });
    } catch(e) {
      this.error(e, `calling ${resolvedUrl}`);
    }
    
    if (res) {
      try {
        const playlist = await this.adapter.adaptPlaylist(res);
        await this.persist<PlaylistModel>(profile, playlistKey, playlist);
          this.cache.set<PlaylistModel>(
            profile,
            "soundcloud",
            playlistKey,
            playlist
          );
        return playlist;
      } catch (e) {
        throw this.error(
          err(500, e.message || "an error occured : database's unavailable")
        );
      }
    } else {
      const data = await this.fromDb<PlaylistModel>(profile, playlistKey);
      if (data) return data.content;
      else throw this.error(err(400, "request to soundcloud not completed..."));
    }
  };
}

export default Soundcloud;
