import { SoundcloudAdapter } from "./soundcloud";
import SC from "node-soundcloud";
import config from "../config";
import { rejects } from "assert";

export class DiscogsAdapter {
  soundcloudAdapter = {};
  constructor() {
    this.soundcloudAdapter = new SoundcloudAdapter();
    SC.init({
      id: config.soundcloud.clientId,
      secret: config.soundcloud.clientSecret
    });
  }

  buildStreamQuery = (track, artist) => {
    let query = artist ? `${artist} - ` : "";
    query = `${query}${track.title}`;
    let remixer = "";
    if (track.title.indexOf("(") === -1) {
      if (track.extraartists && track.extraartists.length > 1) {
        remixer = track.extraartists
          .map((artist, index) => {
            let temp = "";
            if (
              track.extraartists[index + 1] &&
              track.extraartists[index + 1].role === artist.role
            ) {
              temp = `${artist.name} and `;
            } else {
              temp = `${artist.name} ${artist.role}${
                index === track.extraartists.length - 1 ? "" : ", "
              }`;
            }
            return temp;
          })
          .join("");
        if (remixer.length) {
          query = `${query} (${remixer})`;
        }
      } else if (track.extraartists && track.extraartists.length === 1) {
        remixer = track.extraartists[0];
        query = `${query} (${remixer.name} ${remixer.role})`;
      }
    }
    return query;
  };

  patternMatch(title, search, artist, label) {
    const pattern = /(\&|\-|\"|\'|\~|\#|\.|\,|\@|\_)/gi;
    const originalPattern = /\((original\smix|original\sversion|original)\)/gi;
    const clean = title => title.replace(pattern, "").trim();
    const removePattern = /(podcast|dj set|concert|live|snippet|extrait)/gi;
    if (
      search.indexOf(removePattern) === -1 &&
      title.indexOf(removePattern) > -1
    )
      return false;
    const cleanSearch = clean(search)
      .replace(originalPattern, "")
      .replace(artist, "")
      .replace(label, "")
      .trim();
    const cleanTitle = clean(title)
      .replace(originalPattern, "")
      .replace(artist, "")
      .replace(label, "")
      .trim();
    if (cleanTitle === cleanSearch) return true;
    if (cleanTitle.indexOf(cleanSearch) === -1) return false;
    if (cleanTitle.indexOf("(") > -1) {
      const parenthesis = cleanTitle.substring(
        cleanTitle.indexOf("("),
        cleanTitle.indexOf(")") + 1
      );
      if (!parenthesis || cleanSearch.indexOf(parenthesis) > -1) return true;
      return false;
    }
    if (cleanTitle.indexOf("[")) {
      const brackets = cleanTitle.substring(
        cleanTitle.indexOf("["),
        cleanTitle.indexOf("]") + 1
      );
      if (cleanSearch.indexOf(brackets) > -1) return true;
      return false;
    }
    return true;
  }

  getStreaming(track, label) {
    return new Promise((resolve, reject) => {
      try {
        const artist = (track.artists || [])
          .map(artist => artist.name.replace(/\([0-9]\)/g, "").trim())
          .join(" ");
        const query = this.buildStreamQuery(track, artist);
        if (!query) return resolve(null);
        SC.get(
          "/tracks",
          {
            q: query
          },
          (error, res) => {
            if (error) {
              reject(error);
            }
            if (res) {
              let stream = res.find(stream => stream.title === track.title);
              if (!stream) {
                const matchingTitles = res.filter(t =>
                  this.patternMatch(t.title, track.title, artist, label)
                );

                stream = matchingTitles.find(
                  value =>
                    value.duration ===
                    matchingTitles.reduce(
                      (acc, value) => Math.max(acc, value.duration),
                      0
                    )
                );
              }
              if (!stream)
                return resolve({
                  fullTitle: query,
                  stream: null
                });
              return resolve({
                fullTitle: query,
                stream: this.soundcloudAdapter.adaptTrack(stream)
              });
            } else
              return resolve({
                fullTitle: query,
                stream: null
              });
          }
        );
      } catch (e) {
        console.log(e);
        return resolve(null);
      }
    });
  }

  async adaptTracklist(tracklist, release) {
    const tracks = await Promise.all(
      tracklist.map(async track => {
        const streamResult = await this.getStreaming(track, release.label);
        return {
          title: track.title,
          duration: track.duration,
          position: track.position,
          artists: track.artists,
          extraartists: track.extraartists,
          ...(streamResult || {})
        };
      })
    );
    return tracks;
  }

  async adaptRelease(release, infos) {
    release.releaseDate = infos.released;
    release.cat = infos.labels[0].cat || infos.labels[0].catno;
    release.artist = release.artist.replace(/\([0-9]\)/g, "").trim();
    release.tracklist = await this.adaptTracklist(infos.tracklist, release);
    release.notes = infos.notes;
    return release;
  }
}

export default DiscogsAdapter;
