// to be implemented
import SC from "node-soundcloud";
import config from "../config";
import SoundcloudAdapter from "../adapters/soundcloud";
import Service from "../service";
import err from "../err";
import Api from "../lib/api";
import Resolvers from "../lib/resolvers";

export class Soundcloud extends Service {
  constructor(database) {
    super(database);
    this.adapter = new SoundcloudAdapter();
  }

  getTrack = (profile, args) =>
    new Promise((resolve, reject) => {
      const { id } = args;
      if (!id) throw err(400, "id required");
      SC.init({
        id: config.soundcloud.clientId,
        secret: config.soundcloud.clientSecret
      });
      SC.get(`/tracks/${id}`, (error, res) => {
        if (res && !error) {
          try {
            const track = this.adapter.adaptTrack(res);
            resolve(track);
          } catch (e) {
            reject(err(500, "error during payload construction"));
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
              reject(err(500, e.message || "an error occured"));
            });
        }
      });
    });

  getTracks = profile =>
    new Promise((resolve, reject) => {
      SC.init({
        id: config.soundcloud.clientId,
        secret: config.soundcloud.clientSecret
      });
      SC.get(`/users/${profile.soundcloud.id}/tracks`, (error, res) => {
        if (res) {
          let tracks = this.adapter.adapt(res);
          this.persist(profile, "tracks", tracks).then(() => {
            resolve(tracks);
          });
        } else {
          this.fromDb(profile, "tracks")
            .then(data => {
              resolve(data.content);
            })
            .catch(e => {
              if (error) reject(err(400, error));
              else {
                reject(err(400, "request to soundcloud not completed..."));
              }
            });
        }
      });
    });

  getPlaylist = async (profile, args) => {
    const { name } = args;
    if (!name) throw err(400, "missing playlist url fragment in query");
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
        await this.persist(profile, "playlist", playlist);
        return playlist;
      } catch (e) {
        console.log(e);
        throw err(500, "an error occured : database's unavailable");
      }
    } else {
      const data = await this.fromDb(profile, "playlist");
      if (data) {
        return data.content;
      } else {
        throw err(400, "request to soundcloud not completed...");
      }
    }
  };
}

export default Soundcloud;
