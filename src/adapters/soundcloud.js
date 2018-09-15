export class SoundcloudAdapter {
    adaptTrack = (track, clientId) => {
        const keys = [ 'uri', 'stream_url', 'download_url', 'attachments_uri' ];
        keys.forEach((key) => {
            track[key] = `${track[key]}?clientId=${clientId}`;
        });
        return track;
    };

    adapt = (data, profile) => data.map((track) => this.adaptTrack(track, profile.soundcloud.clientId));
}

export default SoundcloudAdapter;
