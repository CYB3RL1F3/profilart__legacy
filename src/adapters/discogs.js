import { ReleaseMatcher } from "../lib/releaseMatcher";
export class DiscogsAdapter {
  async adaptTracklist(tracklist, release) {
    const releaseMatcher = new ReleaseMatcher();
    const tracks = await Promise.all(
      tracklist.map(async track => {
        const streamResult = await releaseMatcher.getStreaming(
          track,
          release.label
        );
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
