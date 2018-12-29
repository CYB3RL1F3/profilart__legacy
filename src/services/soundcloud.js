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
        console.log(res);
        const playlist = await this.adapter.adaptPlaylist(res);
        console.log(playlist);
        await this.persist(profile, "playlist", playlist);
        console.log("pass");
        return playlist;
      } catch (e) {
        console.log(e);
        throw err(500, "an error occured : database's unavailable");
      }
    } else {
      console.log("hummmm");
      const data = await this.fromDb(profile, "playlist");
      console.log(data);
      if (data) {
        return data.content;
      } else {
        throw err(400, "request to soundcloud not completed...");
      }
    }
  };
}

export default Soundcloud;
