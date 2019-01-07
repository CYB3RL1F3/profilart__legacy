import config from "../config";
import Api from "../lib/api";
export class SoundcloudAdapter {
  adaptTrack = track => {
    const { clientId } = config.soundcloud;
    const keys = ["uri", "stream_url", "download_url", "attachments_uri"];
    keys.forEach(key => {
      track[key] = `${track[key]}?clientId=${clientId}`;
    });
    return {
      id: track.id,
      title: track.title,
      date: track.created_at,
      genre: track.genre,
      artwork: track.artwork_url,
      description: track.description,
      download: track.download_url,
      downloadable: track.downloadable,
      soundcloud: track.permalink_url,
      duration: track.duration,
      waveform: track.waveform_url,
      taglist: this.extractTagList(track.tag_list),
      uri: track.uri,
      url: track.stream_url,
      license: track.license,
      stats: {
        count: track.playback_count,
        downloads: track.download_count,
        favorites: track.favoritings_count
      }
    };
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
    const trackInfos = await api.requestAndParseJSON({
      url: `${track.uri}?client_id=${config.soundcloud.clientId}`,
      method: "GET",
      headers: {
        "User-Agent": "Profilart/1.0 +https://profilart.herokuapp.com",
        "Content-Type": "application/json"
      }
    });
    const keys = ["permalink_url", "download_url"];

    const { clientId } = config.soundcloud;
    keys.forEach(key => {
      track[key] = `${track[key]}?clientId=${clientId}`;
    });
    return {
      id: track.id,
      title: track.title,
      date: track.display_date,
      artwork: track.artwork_url,
      description: track.description,
      download: track.download_url,
      downloadable: track.downloadable,
      soundcloud: track.permalink_url,
      genre: track.genre,
      license: track.license,
      stats: {
        count: track.playback_count,
        downloads: track.download_count,
        favorites: track.favoritings_count
      },
      duration: source.duration,
      url: audio.url,
      taglist: this.extractTagList(track.tag_list),
      waveform: trackInfos.waveform_url
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

  adapt = data => data.map(track => this.adaptTrack(track));
}

export default SoundcloudAdapter;
