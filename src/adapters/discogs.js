export class DiscogsAdapter {
    adaptRelease(release, infos) {
        release.releaseDate = infos.released;
        release.cat = infos.labels[0].cat || infos.labels[0].catno;
        release.tracklist = infos.tracklist.map(({ title, duration, position }) => ({ title, duration, position }));
        release.artist.replace(/\([0-9]\)/g, '').trim();
        release.notes = infos.notes;
        return release;
    }
}

export default DiscogsAdapter;
