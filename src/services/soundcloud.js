// to be implemented
import SC from 'node-soundcloud';
import config from '../config';
import SoundcloudAdapter from '../adapters/soundcloud';
import Service from '../service';
import err from '../err';

export class Soundcloud extends Service {
    constructor(database) {
        super(database);
        this.adapter = new SoundcloudAdapter();
    }

    getTracks = (profile) =>
        new Promise((resolve, reject) => {
            SC.init({
                id: config.soundcloud.clientId,
                secret: config.soundcloud.clientSecret
            });
            SC.get(`/users/${profile.soundcloud.id}/tracks`, (error, res) => {
                if (res) {
                    let tracks = this.adapter.adapt(res);
                    this.persist(profile, 'tracks', tracks).then(() => {
                        resolve(tracks);
                    });
                } else {
                    this.fromDb(profile, 'tracks')
                        .then((data) => {
                            resolve(data.content);
                        })
                        .catch((e) => {
                            console.log(e);
                            if (error) reject(err(400, error));
                            else {
                                reject(err(400, 'request to soundcloud not completed...'));
                            }
                        });
                }
            });
        });
}

export default Soundcloud;
