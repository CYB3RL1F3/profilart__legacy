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
        const endpoint = `${config.api.discogs.api_url}/artists/${id}/releases`;
        this.query(endpoint).then((res) => {
            const releases = res.releases;
            const promises = [];
            if (releases) {
              releases.forEach((release) => {
                  promises.push(new Promise((done, fail) => {
                      this.query(release.resource_url).then((infos) => {
                          if (infos.main_release_url) {
                              this.query(infos.main_release_url).then((inf) => {
                                  this.adapter.adaptRelease(release, inf);
                                  done();
                              }).catch(done);
                          } else {
                              this.adapter.adaptRelease(release, infos);
                              done();
                          }
                      }).catch(done);
                  }));
              });
            }

            Promise.all(promises).then(() => {
                this.persist(profile, 'releases', releases).then((data) => {
                    resolve(releases);
                }).catch(reject);
            }).catch(reject)
        }).catch((e) => {
            console.log(e);
            this.fromDb(profile, 'releases').then((data) => {
                resolve(data.content);
            }).catch(() => {
              console.log(e);
              reject(e);
            })
        })
    })

    query = (url) => this.api.requestAndParseJSON({
        url: `${url}?key=${config.api.discogs.key}&secret=${config.api.discogs.secret}`,
        method: 'GET',
        headers: {
            'User-Agent':       'Profilart/1.0 +https://profilart.herokuapp.com',
            'Content-Type':     'application/x-www-form-urlencoded'
        }
    })

}

export default Discogs;
