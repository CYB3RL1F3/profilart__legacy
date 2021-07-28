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
import { MixesDB } from "lib/mixesdb";

import {
  Track,
  PlaylistArgs,
  PlaylistModel,
  RawPlaylist,
  RawComments,
  RawLikes,
  RawTrack
} from "model/playlist";
import { InfosModel, SoundcloudInfosRaw } from "model/infos";

export class SoundcloudProvider extends Service {
  adapter: SoundcloudAdapter;
  constructor(database) {
    super(database);
    this.adapter = new SoundcloudAdapter();
    SC.init({
      id: config.soundcloud.clientId,
      secret: config.soundcloud.clientSecret
    });
  }

  getComments = async (trackId: number): Promise<RawComments> => {
    const url = `https://api.soundcloud.com/tracks/${trackId}/comments?limit=200&linked_partitioning=true&client_id=${config.soundcloud.clientId}`;
    const api = new Api();
    try {
      const res = await api.requestAndParseJSON<RawComments>({
        url,
        method: "GET",
        headers: {
          "User-Agent": config.userAgent,
          "Content-Type": "application/json"
        }
      });
      return res;
    } catch (e) {
      console.log("COMMENTS URL ===> ", url);
      console.log("COMMENTS ERROR ==> ", e);
      return {
        collection: []
      };
    }
  };

  getLikes = async (trackId: number): Promise<RawLikes> => {
    const url = `https://api.soundcloud.com/tracks/${trackId}/favoriters?limit=200&linked_partitioning=true&client_id=${config.soundcloud.clientId}&limit=200`;
    const api = new Api();
    try {
      const res = await api.requestAndParseJSON<RawLikes>({
        url,
        method: "GET",
        headers: {
          "User-Agent": config.userAgent,
          "Content-Type": "application/json"
        }
      });
      return res;
    } catch (e) {
      console.log("LIKERS URL ==> ", url);
      console.log("LIKES ERROR ==> ", e);
      return {
        collection: []
      };
    }
  };

  getTrack = (profile: ProfileModel, args: TracksArgs): Promise<Track> =>
    new Promise<Track>((resolve, reject) => {
      const { id } = args;
      if (!id) throw err(400, "id required");
      SC.get(`/tracks/${id}`, async (error, res) => {
        if (res && !error) {
          try {
            res.comments = await this.getComments(res.id);
            res.likes = await this.getLikes(res.id);
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
          reject(err(400, "track not found"));
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
      SC.get(`/users/${profile.soundcloud.id}/tracks`, async (error, res) => {
        if (res && res.length && !error) {
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
          if (error) reject(this.error(err(400, error)));
          else if (res && res.length === 0) resolve([]);
          else
            reject(
              this.error(err(500, "request to soundcloud not completed..."))
            );
        }
      });
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
    const api = new Api();
    const resolvedUrl = resolver.resolvePlaylistUrl(profile, name);
    let res: RawPlaylist;
    let error = null;
    try {
      res = await api.requestAndParseJSON<RawPlaylist>({
        url: resolvedUrl,
        method: "GET",
        headers: {
          "User-Agent": config.userAgent,
          "Content-Type": "application/json"
        }
      });
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
              console.log(
                "\n\n** GO TRACK ID ==> ",
                track.id,
                " is ",
                track.title,
                "\n\n"
              );
              const [tracklist, comments, likes] = await Promise.all([
                this.getTracklist(profile.artistName, track.permalink_url),
                this.getComments(track.id),
                this.getLikes(track.id)
              ]);
              console.log("\n///////////////////////////", "\n\n");
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
