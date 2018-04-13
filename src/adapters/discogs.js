export class DiscogsAdapter {
    adaptRelease (release, infos) {
        release.releaseDate = infos.released;
        release.cat = infos.labels[0].cat || infos.labels[0].catno;
        release.tracklist = [];
        infos.tracklist.forEach((track) => {
            release.tracklist.push({
                title: track.title,
                duration: track.duration,
                position: track.position
            })
        });
        release.artist.replace(/\([0-9]\)/g, '').trim();
        release.notes = infos.notes;
        return release;
    }
}

export default DiscogsAdapter;
