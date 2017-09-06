import config from '../config';
import ResidentAdvisorAdapter from '../adapters/residentadvisor';
import Service from '../service';

export class ResidentAdvisor extends Service {

    static EVENTS_TYPE = {
        1: 'upcoming',
        2: 'past'
    }

    constructor (database) {
        super(database);
        this.adapter = new ResidentAdvisorAdapter();
    }

    query = (endpoint, method, payload) => (
        new Promise((resolve, reject) => {
            const url = `${endpoint}/${method}`;
            const options = {
                url: url,
                method: 'POST',
                headers: {
                    'User-Agent':       'RAPI/0.0.1',
                    'Content-Type':     'application/x-www-form-urlencoded'
                },
                form: payload
            };
            this.api.requestAndParseXML(options)
                .then((response) => {
                    console.log(response.RA);
                    resolve(response.RA);
                }).catch(reject)
        })
    )

    getCharts = (profile, args) => new Promise((resolve, reject) => {
        this.query(
            config.api.residentAdvisor.dj,
            'getcharts',
            {
                DJID: profile.RA.DJID,
                Option: args && args.option || '1',
                UserID: profile.RA.userId,
                AccessKey: profile.RA.accessKey,
                ChartID: ''
            }
        ).then(
            (response) => {
                const charts = this.adapter.adapt(response, 'charts');
                this.persist(profile, 'charts', charts).then(() => {
                    resolve(charts);
                })
            }).catch((e) => {
                // get from database
                this.fromDb(profile, 'charts').then((data) => {
                        resolve(data.content);
                    }).catch(reject);
            })
    })

    getEvents = (profile, args) => new Promise((resolve, reject) => {
        if (!args.type) {
            reject("an arg TYPE must be provided.");
            return;
        }

        const persistKey = `events_${this.constructor.EVENTS_TYPE[args.type]}`;
        this.query(
            config.api.residentAdvisor.events,
            'GetEvents',
            {
                UserID: profile.RA.userId,
                AccessKey: profile.RA.accessKey,
                CountryID: args.countryId || '',
                AreaID: args.areaId || '',
                PromoterID: args.promoterId || '',
                VenueID: args.venueId || '',
                DJID: profile.RA.DJID,
                option: args.type,
                year: args.year || ''
            }
        ).then(
            (response) => {
                const events = this.adapter.adapt(response, 'events');
                this.persist(profile, persistKey, events).then(() => {
                    resolve(events);
                });
            }).catch((e) => {
                this.fromDb(profile, persistKey).then((data) => {
                        resolve(data.content);
                    }).catch(reject);
            })
    })

    getInfos = (profile) => new Promise((resolve, reject) => {
        this.query(
            config.api.residentAdvisor.dj,
            'getartist',
            {
                UserID: profile.RA.userId,
                AccessKey: profile.RA.accessKey,
                DJID: profile.RA.DJID,
                ArtistName: profile.artistName,
                URL: ''
            }
        ).then(
            (response) => {
                const infos = this.adapter.adapt(response, 'infos');
                this.persist(profile, 'infos', infos).then(() => {
                    resolve(infos);
                });
            }).catch((e) => {
                // get from database`
                this.fromDb(profile, 'infos').then((data) => {
                    resolve(data.content);
                }).catch(reject);
            })
    })

};

export default ResidentAdvisor;
