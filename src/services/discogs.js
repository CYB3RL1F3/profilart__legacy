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
                        if (infos.main_release_url) {
                          this.query(infos.main_release_url).then((inf) => {
                            this.adapter.adaptRelease(release, inf);
                            done();
                          })
                        } else {
                          this.adapter.adaptRelease(release, infos);
                          done();
                        }
                    }).catch(fail);
                }));
            });

            Promise.all(promises).then(() => {
                this.persist(profile, 'releases', releases).then((data) => {
                    resolve(releases);
                }).catch(reject);
            }).catch(reject)
        }).catch((e) => {
            this.fromDb(profile, 'releases').then((data) => {
                resolve(data.content);
            }).catch(reject)
        })
    })

    query = (url) => this.api.requestAndParseJSON({
        url: url,
        method: 'GET',
        headers: {
            'User-Agent':       'RAPI/0.0.1',
            'Content-Type':     'application/x-www-form-urlencoded'
        }
    })

}

export default Discogs;
