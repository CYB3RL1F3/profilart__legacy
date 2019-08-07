import SC from "node-soundcloud";
import config from "../config";
import SoundcloudAdapter from "../adapters/soundcloud";
import Service from "../service";
import err from "../err";
import Api from "../lib/api";
import Resolvers from "../lib/resolvers";
import * as Sentry from "@sentry/node";

export class Soundcloud extends Service {
  constructor(database) {
    super(database);
    this.adapter = new SoundcloudAdapter();
    SC.init({
      id: config.soundcloud.clientId,
      secret: config.soundcloud.clientSecret
    });
  }

  getTrack = (profile, args) =>
    new Promise((resolve, reject) => {
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
          this.fromDb(profile, "tracks")
            .then(data => {
              const track = data.content.find(v => v.id === id);
              if (track) {
                resolve(track);
              } else {
                reject(err(400, "track not found"));
              }
            })
            .catch(e => {
              reject(this.error(err(500, e.message || "an error occured")));
            });
        }
      });
    });

  getInfos = profile =>
    new Promise((resolve, reject) => {
      SC.get(`/users/${profile.soundcloud.id}`, (error, res) => {
        if (res) {
          let infos = this.adapter.adaptInfos(res);
          this.persist(profile, "infos", infos).then(() => {
            resolve(infos);
          });
        } else {
          this.fromDb(profile, "infos")
            .then(data => {
              resolve(data.content);
            })
            .catch(e => {
              if (error) reject(this.error(err(400, error)));
              else if (e) reject(this.error(err(500, e.message || e)));
              else
                reject(
                  this.error(err(400, "request to soundcloud not completed..."))
                );
            });
        }
      });
    });

  error = err => {
    Sentry.withScope(scope => {
      scope.setExtra("soundcloud", err);
      Sentry.captureException(err);
    });
    return err;
  };

  getTracks = profile =>
    new Promise((resolve, reject) => {
      const fromCache = this.cache.get(profile, "soundcloud", "tracks");
      if (fromCache) return fromCache;
      SC.get(`/users/${profile.soundcloud.id}/tracks`, (error, res) => {
        if (res) {
          let tracks = this.adapter.adapt(res);
          this.persist(profile, "tracks", tracks).then(() => {
            this.cache.set(profile, "soundcloud", "tracks", tracks);
            resolve(tracks);
          });
        } else {
          this.fromDb(profile, "tracks")
            .then(data => {
              resolve(data.content);
            })
            .catch(e => {
              if (error) reject(this.error(err(400, error)));
              else if (e) reject(this.error(err(500, e.message || e)));
              else reject(err(400, "request to soundcloud not completed..."));
            });
        }
      });
    });

  getPlaylist = async (profile, args) => {
    const { name } = args;
    if (!name) throw err(400, "missing playlist url fragment in query");
    const playlistKey = `playlist_${name}`;
    const fromCache = this.cache.get(profile, "soundcloud", playlistKey);
    if (fromCache) return fromCache;

    const resolver = new Resolvers();
    const api = new Api();
    const resolvedUrl = resolver.resolvePlaylistUrl(profile, name);
    const res = await api.requestAndParseJSON({
      url: resolvedUrl,
      method: "GET",
      headers: {
        "User-Agent": "Profilart/1.0 +https://profilart.herokuapp.com",
        "Content-Type": "application/json"
      }
    });
    if (res) {
      try {
        const playlist = await this.adapter.adaptPlaylist(res);
        await this.persist(profile, playlistKey, playlist);
        this.cache.set(profile, "soundcloud", playlistKey, playlist);
        return playlist;
      } catch (e) {
        throw this.error(
          err(500, e.message || "an error occured : database's unavailable")
        );
      }
    } else {
      const data = await this.fromDb(profile, playlistKey);
      if (data) return data.content;
      else throw this.error(err(400, "request to soundcloud not completed..."));
    }
  };
}

export default Soundcloud;
