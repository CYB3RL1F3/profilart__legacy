import Api from "./api";
import config from "../config";
import err from "../err";
import { ProfileModel } from "model/profile";

class Resolvers {
  resolveSoundcloudClientId = async (url: string): Promise<string> => {
    const resolvedUrl = `${url.replace(
      "soundcloud.com",
      "api.soundcloud.com/users"
    )}?client_id=${config.soundcloud.clientId}`;

    const api = new Api();
    const profile = await api.requestAndParseJSON<{ id: string }>({
      url: resolvedUrl,
      method: "GET",
      headers: {
        "User-Agent": config.userAgent,
        "Content-Type": "application/json"
      }
    });
    if (profile) return profile.id;
    throw err(400, "inexisting soundcloud account");
  };

  resolvePlaylistUrl = (profile: ProfileModel, endpoint: string) => {
    const baseUrl = profile.soundcloud.url;
    const url = `${baseUrl}/sets/${endpoint}`;
    return `https://api.soundcloud.com/resolve?url=${url}&client_id=${config.soundcloud.clientId}`;
  };

  resolveDiscogsArtistId = (url: string) =>
    parseInt(url.substring(url.indexOf("artist/") + 7), 10);

  resolveProfile = async (profile: ProfileModel) => {
    if (profile.soundcloud && profile.soundcloud.url) {
      const clientId = await this.resolveSoundcloudClientId(
        profile.soundcloud.url
      );
      profile.soundcloud.id = clientId;
    }
    if (profile.discogs && profile.discogs.url) {
      profile.discogs.artistId = this.resolveDiscogsArtistId(
        profile.discogs.url
      );
    }
    return profile;
  };

  getDiscogsProxyUrl = (proxyNumber: number) => config.api.discogs.proxy.replace('#', proxyNumber.toString());

  resolveDiscogsProxyUrl = () => {
    const randomProxy = Math.round(Math.random() * config.api.discogs.nbProxies);
    return this.getDiscogsProxyUrl(randomProxy);
  }
}

export default Resolvers;
