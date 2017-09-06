import config from '../config';
import Service from '../service';
import DiscogsAdapter from '../adapters/discogs';

export class Discogs extends Service {

    constructor (database) {
        super(database);
        this.adapter = new DiscogsAdapter();
    }

    getReleases = (profile) => new Promise((resolve, reject) => {
        const id = profile && profile.discogs && profile.discogs.artistId;
        const endpoint = `${config.api.discogs}/artists/${id}/releases`;
        this.query(endpoint).then((res) => {
            const releases = res.releases;
            const promises = [];
            releases.forEach((release) => {
                promises.push(new Promise((done, fail) => {
                    this.query(release.resource_url).then((infos) => {
                        this.adapter.adaptRelease(release, infos);
                        done();
                    }).catch(fail);
                }));
            });

            Promise.all(promises).then(() => {
                this.persist(profile, 'releases', releases).then(() => {
                    resolve(releases);
                }).catch(reject);
            }).catch(reject)
        }).catch((e) => {
            this.fromDb(profile, 'releases').then((data) => {
                resolve(data.content);
            }).catch(reject)
        })
    })

    query (url) {
        const options = {
            url: url,
            method: 'GET',
            headers: {
                'User-Agent':       'RAPI/0.0.1',
                'Content-Type':     'application/x-www-form-urlencoded'
            }
        };
        return this.api.requestAndParseJSON(options);
    }

}

export default Discogs;
