import ResidentAdvisor from './services/residentadvisor';
import Discogs from './services/discogs';
import Contact from './services/contact';
import Soundcloud from './services/soundcloud';
import err from './err';
import Sender from './lib/sender';
import Validator from './lib/validator';
import Database from './lib/database';
import Sessions from './lib/session';
import Profiles from './services/profiles';
import All from './services/all';

export class Application {

    services = {};
    validator = {};
    profiles = {}
    sessions = {}

    serviceExists = (method) => typeof this.services[method] === 'function';

    constructor () {
        this.init();
    }

    init () {
        const database = new Database();
        const residentAdvisor = new ResidentAdvisor(database);
        const discogs = new Discogs(database);
        const soundcloud = new Soundcloud(database);
        const contact = new Contact();
        const all = new All(database, residentAdvisor, discogs, soundcloud);
        this.validator = new Validator();
        this.sessions = new Sessions();
        this.profiles = new Profiles(database, this.sessions);

        // fill services dictionnary with different ones
        this.services = {
            charts: residentAdvisor.getCharts,
            events: residentAdvisor.getEvents,
            infos:  residentAdvisor.getInfos,
            tracks: soundcloud.getTracks,
            contact: contact.mail,
            releases: discogs.getReleases,
            all: all.get,
            // profile
            login: this.profiles.login,
            profile: this.profiles.read,
            create: this.profiles.create,
            update: this.profiles.update
        }
    }

    run (data, socket, id) {
        if (!socket) {
            console.log('Invalid socket connection. Can\'t process properly.');
            return;
        }

        const sender = new Sender(socket, id);

        try {
            data = JSON.parse(data);
            this.validator.checkData(data, this);
            this.serve(data, sender);
        } catch (e) {
            sender.error(e.code || 500, e.message);
        }
    }

    getProfile = (data) =>
        data.query !== 'create' && data.query !== 'login'
        ? this.profiles.get(data.uid)
        : new Promise((resolve) => resolve({}))

    serve (data, sender) {
        this.getProfile(data).then((profile) => {
            try {
                this.validator.checkProfile(profile, data.query);
                this.execute(data.query, profile, data.args, sender).then((response) => {
                    sender.send(data.query, response);
                }).catch((e) => {
                    sender.error(e.code || 500, e.message);
                });
            } catch (e) {
                sender.error(e.code || 500, e.message);
            }
        }).catch((e) => {
            sender.error(401, 'profile not registred');
        });
    }

    execute (method, profile, args, sender) {
        const fn = this.services[method];
        if (!fn) {
            throw err(404, 'service not found');
        }
        return fn(profile, args, sender);
    }
}

export default Application;
