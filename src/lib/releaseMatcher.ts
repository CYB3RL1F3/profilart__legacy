import { SoundcloudAdapter } from "adapters/soundcloud";
import SC from "node-soundcloud";
import config from "config";
import { withScope, captureException } from "@sentry/node";
import { ReleaseTrack } from "model/releases";
import { regexIndexOf } from "./string";

export class ReleaseMatcher {
  soundcloudAdapter: SoundcloudAdapter;
  constructor() {
    this.soundcloudAdapter = new SoundcloudAdapter();
    SC.init({
      id: config.soundcloud.clientId,
      secret: config.soundcloud.clientSecret
    });
  }

  buildStreamQuery = (track: ReleaseTrack, artist: string) => {
    let query = artist ? `${artist} - ` : "";
    query = `${query}${track.title}`;

    if (track.title.indexOf("(") === -1 && track.title.indexOf("[") === -1) {
      if (track.extraartists && track.extraartists.length > 1) {
        const remixer = track.extraartists
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
        const remixer = track.extraartists[0];
        query = `${query} (${remixer.name} ${remixer.role})`;
      }
    }

    return query.replace(/\[/gi, "(").replace(/\]/gi, ")");
  };

  patternMatch(title: string, search: string, artist: string, label: string) {
    const pattern = /(\&|\-|\"|\'|\~|\#|\.|\,|\@|\_)/gi;
    const originalPattern = /\((original\smix|original\sversion|original)\)/gi;
    const clean = (title: string) => title.replace(pattern, "").trim();
    const removePattern = /(podcast|dj set|concert|live|snippet|extrait)/gi;
    if (
      regexIndexOf(search, removePattern) === -1 &&
      regexIndexOf(title, removePattern) > -1
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

  getStreamByFilteringResults(res, track, artist, label) {
    let stream = res.find((stream) => stream.title.toLowerCase() === track.title.toLowerCase() && stream.user.username.toLowerCase().indexOf(artist.toLowerCase()) > -1);
    if (!stream) {
      // filter patterns (remove dj sets, snippets, etc)
      const matchingTitles = res.filter((t) =>
        this.patternMatch(t.title, track.title, artist, label)
      );
      // filter titles to keep the ones that name properly the track
      let streams = matchingTitles.filter(
        (value) =>
          value.title.toLowerCase().indexOf(track.title.toLowerCase()) > -1
      );
      // filter by artist name and/or label
      streams = matchingTitles.filter(
        (value) =>
          value.user.username.toLowerCase().indexOf(artist.toLowerCase()) > -1 ||
          value.title.toLowerCase().indexOf(artist.toLowerCase()) > -1 ||
          value.user.username.toLowerCase().indexOf(label.toLowerCase()) > -1 ||
          value.title.toLowerCase().indexOf(label.toLowerCase()) > -1 ||
          (
            (
              value.permalink_url.toLowerCase().indexOf(artist.toLowerCase()) > -1 ||
              value.permalink_url.toLowerCase().indexOf(label.toLowerCase()) > -1
            ) &&
            value.permalink_url.toLowerCase().indexOf(track.title.toLowerCase()) > -1
          ) ||
          (
            (
              value.description.toLowerCase().indexOf(artist.toLowerCase()) > -1 ||
              value.description.toLowerCase().indexOf(label.toLowerCase()) > -1 
            ) &&
            value.description.toLowerCase().indexOf(track.title.toLowerCase()) > -1
          )
      );
      // if there's more than one result, get biggest duration (supposed to choose between snippet & track)
      if (streams.length > 1) {
        stream = streams.find(
          (value) =>
            value.duration ===
            streams.reduce(
              (acc, value) => Math.max(acc, value.duration),
              0
            )
        );
      } else {
        stream = streams[0];
      }
    }
    return stream;
  }

  getStreaming = (track: ReleaseTrack, label: string) =>
    new Promise<ReleaseTrack>((resolve, reject) => {
      try {
        const artist = (track.artists || [])
          .map((artist) => artist.name.replace(/\([0-9]\)/g, "").trim())
          .join(" ").trim();
        const query = this.buildStreamQuery(track, artist);
        if (!query) return resolve(null);
        SC.get(
          "/tracks",
          {
            q: query
          },
          async (error, res) => {
            if (error) {
              withScope((scope) => {
                scope.setExtra("releaseMatcher", error);
                captureException(error);
              });
              reject(error);
            }
            if (res) {
              const stream = this.getStreamByFilteringResults(res, track, artist, label);
              if (!stream)
                return resolve({
                  fullTitle: query,
                  stream: null
                });
              return resolve({
                fullTitle: query,
                stream: await this.soundcloudAdapter.adaptTrack(stream)
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
