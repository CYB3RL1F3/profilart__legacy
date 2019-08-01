import Api from "./api";
import config from "../config";
import err from "../err";

class Resolvers {
  resolveSoundcloudClientId = async url => {
    const resolvedUrl = `${url.replace(
      "soundcloud.com",
      "api.soundcloud.com/users"
    )}?client_id=${config.soundcloud.clientId}`;

    const api = new Api();
    const profile = await api.requestAndParseJSON({
      url: resolvedUrl,
      method: "GET",
      headers: {
        "User-Agent": "Profilart/1.0 +https://profilart.herokuapp.com",
        "Content-Type": "application/json"
      }
    });
    if (profile) return profile.id;
    throw err(400, "inexisting soundcloud account");
  };

  resolvePlaylistUrl = (profile, endpoint) => {
    const baseUrl = profile.soundcloud.url;
    const url = `${baseUrl}/sets/${endpoint}`;
    return `https://api-v2.soundcloud.com/resolve?url=${url}&client_id=${
      config.soundcloud.clientId
    }`;
  };

  resolveDiscogsArtistId = url =>
    parseInt(url.substring(url.indexOf("artist/") + 7), 10);

  resolveProfile = async profile => {
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
}

export default Resolvers;
