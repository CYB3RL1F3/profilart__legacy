import { ReleaseMatcher } from "../lib/releaseMatcher";
import Adapter from "adapters/adapter";
import {
  DiscogsRelease,
  ReleaseInfo,
  Release,
  RawTracklist,
  ReleaseTrack
} from "model/releases";

export class DiscogsAdapter extends Adapter {
  async adaptTracklist(
    tracklist: RawTracklist[],
    release: Release
  ): Promise<ReleaseTrack[]> {
    const releaseMatcher = new ReleaseMatcher();
    const tracks = await Promise.all<ReleaseTrack>(
      tracklist.map(async (track) => {
        let streamResult = null;
        try {
          streamResult = await releaseMatcher.getStreaming(
            track,
            release.label
          );
        } catch(e) {
          console.log(e);
        }
        
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

  async adaptRelease(releaseDiscogs: DiscogsRelease, infos: ReleaseInfo) {
    const release: Release = {
      ...releaseDiscogs
    };
    release.label = release.label || (infos.labels[0] && infos.labels[0].name);
    release.releaseDate = infos.released;
    release.cat = infos.labels ? infos.labels[0].cat || infos.labels[0].catno : null;
    release.artist = release.artist.replace(/\([0-9]\)/g, "").trim();
    release.tracklist = await this.adaptTracklist(infos.tracklist, release);
    release.notes = infos.notes;
    release.images = infos.images ? infos.images.map((image) => image.uri) : [];
    release.thumb = release.images[0] || release.thumb;
    release.discogs = infos.uri;
    release.styles = infos.styles;
    return release;
  }
}

export default DiscogsAdapter;
