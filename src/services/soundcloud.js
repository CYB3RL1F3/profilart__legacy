// to be implemented
import SC from 'node-soundcloud';
import config from '../config';
import SoundcloudAdapter from '../adapters/soundcloud';
import Service from '../service';
import err from '../err';

export class Soundcloud extends Service {
    constructor (database) {
        super(database);
        this.adapter = new SoundcloudAdapter();
    }

    getTracks = (profile, args) => (
      new Promise((resolve, reject) => {
        console.log(profile.soundcloud);
        SC.init({
          id: profile.soundcloud.clientId,
          secret: profile.soundcloud.clientSecret
        });
        console.log(SC);
        SC.get(`/users/${profile.soundcloud.id}/tracks`, (err, res) => {
          if (res) {
            let tracks = this.adapter.adapt(res, profile);
            this.persist(profile, 'tracks', tracks).then(() => {
              resolve(tracks);
            });
          } else {
            this.fromDb(profile, 'tracks').then((data) => {
                resolve(data.content);
            }).catch((e) => {
              if (err) reject(err);
              else {
                console.log(res);
                reject(err(400, 'request to soundcloud not completed...'));
              }
            });

          }
        });
      })
    )

};

export default Soundcloud;
