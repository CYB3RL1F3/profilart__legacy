import Service from '../service';
import AllAdapters from '../adapters/all';

export class All extends Service {
    residentAdvisor = {};
    discogs = {};
    adapter = {};

    constructor (database, residentAdvisor, discogs, soundcloud) {
        super(database);
        this.residentAdvisor = residentAdvisor;
        this.discogs = discogs;
        this.soundcloud = soundcloud;
        this.adapter = new AllAdapters();
    }

    get = (profile, args) => new Promise((resolve, reject) => {
        const services = [
            this.residentAdvisor.getInfos(profile),
            this.residentAdvisor.getCharts(profile),
            this.residentAdvisor.getEvents(profile, {type: 1}),
            this.residentAdvisor.getEvents(profile, {type: 2}),
            this.discogs.getReleases(profile),
            this.soundcloud.getTracks(profile),
        ];
        Promise.all(services).then((responses) => {
            resolve(this.adapter.adapt(responses));
        }).catch(reject);
    })
}

export default All;
