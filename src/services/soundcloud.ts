
import Service from "../service";
import err from "../err";
import { withScope, captureException } from "@sentry/node";
import { ProfileModel } from "model/profile";
import { Models } from "model/models";
import { TracksArgs } from "model/tracks";
import {
  Track,
  PlaylistArgs,
  PlaylistModel
} from "model/playlist";
import { InfosModel } from "model/infos";

export class Soundcloud extends Service {
  constructor(database) {
    super(database);
  }

  getTrack = (profile: ProfileModel, args: TracksArgs): Promise<Track> =>
    new Promise<Track>((resolve, reject) => {
      const { id } = args;
      if (!id) throw err(400, "id required");
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
    });

  getInfos = (profile: ProfileModel) =>
    new Promise<InfosModel>((resolve, reject) => {
      this.fromDb<InfosModel>(profile, Models.infos)
        .then((data) => {
          resolve(data.content);
        })
        .catch((e) => {
          if (e) reject(this.error(err(500, e.message || e)));
          else
            reject(
              this.error(
                err(400, "request to soundcloud not completed...")
              )
            );
        });
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

      this.fromDb<Track[]>(profile, Models.tracks)
        .then((data) => {
          resolve(data.content);
        })
        .catch((e) => {
          console.log(e);
          if (e) reject(this.error(err(500, e.message || e)));
          else reject(this.error(err(500, "request to soundcloud not completed...")));
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
    const data = await this.fromDb<PlaylistModel>(profile, playlistKey);
    if (data) return data.content;
    else throw this.error(err(400, "No data available..."));
  };
}

export default Soundcloud;
