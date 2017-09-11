import ResidentAdvisor from './services/residentadvisor';
import Discogs from './services/discogs';
import Contact from './services/contact';
import err from './err';
import Sender from './lib/sender';
import Validator from './lib/validator';
import Database from './lib/database';
import Profiles from './services/profiles';
import All from './services/all';

export class Application {

    services = {};
    validator = {};
    profiles = {}

    serviceExists = (method) => typeof this.services[method] === 'function';

    constructor () {
        this.init();
    }

    init () {
        const database = new Database();
        const residentAdvisor = new ResidentAdvisor(database);
        const discogs = new Discogs(database);
        const contact = new Contact();
        const all = new All(database, residentAdvisor, discogs);
        this.validator = new Validator();
        this.profiles = new Profiles(database);

        // fill services dictionnary with different ones
        this.services = {
            charts: residentAdvisor.getCharts,
            events: residentAdvisor.getEvents,
            infos:  residentAdvisor.getInfos,
            contact: contact.mail,
            releases: discogs.getReleases,
            all: all.get,
            profile: this.profiles.read,
            create: this.profiles.create,
            update: this.profiles.update
        }
    }

    run (data, socket) {
        if (!socket) {
            console.log('Invalid socket connection. Can\'t process properly.');
            return;
        }

        const sender = new Sender(socket);

        try {
            data = JSON.parse(data);
            this.validator.checkData(data, this);
            this.serve(data, sender);
        } catch (e) {
            sender.error(e.code || 500, e.message);
        }
    }

    getProfile = (data) =>
        data.query !== 'create'
        ? this.profiles.get(data.uid)
        : new Promise((resolve) => resolve({}))

    serve (data, sender) {
        this.getProfile(data).then((profile) => {
            try {
                this.validator.checkProfile(profile, data.query);
                this.execute(data.query, profile, data.args).then((response) => {
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

    execute (method, profile, args) {
        const fn = this.services[method];
        if (!fn) {
            throw err(404, 'service not found');
        }
        return fn(profile, args);
    }
}

export default Application;
