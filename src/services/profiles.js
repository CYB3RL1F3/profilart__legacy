import config from '../config';
import Service from '../service';
import err from '../err';

export class Profiles extends Service {

    profiles = {};

    get = (uid) => new Promise((resolve, reject) => {
        if (this.profiles[uid]) {
            resolve(this.profiles[uid]);
        } else {
            this.database.select(uid, 'profiles').then((profile) => {
                if (profile) {
                    profile.content.uid = uid;
                    this.profiles[uid] = profile.content;
                    resolve(profile.content);
                } else {
                    reject(err(401, "profile not found"));
                }
            }).catch((e) => {
                reject(err(401, "profile not found"));
            })
        }
    });

    constructor (database) {
        super(database);
    }
}

export default Profiles;
