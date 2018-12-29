import config from "../config";
import Api from "../lib/api";
export class SoundcloudAdapter {
  adaptTrack = (track, clientId) => {
    const keys = ["uri", "stream_url", "download_url", "attachments_uri"];
    keys.forEach(key => {
      track[key] = `${track[key]}?clientId=${clientId}`;
    });
    return track;
  };

  adaptPlaylistTrack = async track => {
    const source = track.media.transcodings[1];
    const api = new Api();
    const audio = await api.requestAndParseJSON({
      url: `${source.url}?client_id=${config.soundcloud.clientId}`,
      method: "GET",
      headers: {
        "User-Agent": "Profilart/1.0 +https://profilart.herokuapp.com",
        "Content-Type": "application/json"
      }
    });
    return {
      artwork: track.artwork_url,
      description: track.description,
      download: track.download_url,
      soundcloud: track.permalink_url,
      duration: source.duration,
      url: audio.url
    };
  };

  extractTagList = tagList => {
    let bypass = false;
    return tagList.split(" ").reduce((acc, content) => {
      const data = content.replace('"', "");
      if (bypass) {
        acc[acc.length - 1] += ` ${data}`;
        bypass = content.indexOf('"') === -1;
      } else {
        acc.push(data);
        bypass = content.indexOf('"') > -1;
      }

      return acc;
    }, []);
  };

  adaptPlaylist = async playlist => {
    const tracks = await Promise.all(
      playlist.tracks.map(async track => await this.adaptPlaylistTrack(track))
    );
    return {
      title: playlist.title,
      description: playlist.description,
      genre: playlist.genre,
      taglist: this.extractTagList(playlist.tag_list),
      artwork: playlist.artwork_url,
      soundcloud: playlist.permalink_url,
      tracks
    };
  };

  adapt = data =>
    data.map(track => this.adaptTrack(track, config.soundcloud.clientId));
}

export default SoundcloudAdapter;
