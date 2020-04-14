import { SoundcloudAdapter } from "adapters/soundcloud";
import SC from "node-soundcloud";
import config from "config";
import * as Sentry from "@sentry/node";
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

  getStreaming = (track: ReleaseTrack, label: string) =>
    new Promise<ReleaseTrack>((resolve, reject) => {
      try {
        const artist = (track.artists || [])
          .map((artist) => artist.name.replace(/\([0-9]\)/g, "").trim())
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
              Sentry.withScope((scope) => {
                scope.setExtra("releaseMatcher", error);
                Sentry.captureException(error);
              });
              reject(error);
            }
            if (res) {
              let stream = res.find((stream) => stream.title === track.title);
              if (!stream) {
                const matchingTitles = res.filter((t) =>
                  this.patternMatch(t.title, track.title, artist, label)
                );

                stream = matchingTitles.find(
                  (value) =>
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
