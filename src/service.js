import Api from './lib/api';
import Database from './lib/database';
import config from './config';

export class Service {
    api = {};
    database = {};
    adapter = {};

    persist = (profile, key, value) => this.database.persist(profile.uid, key, value);

    fromDb = (profile, key) => this.database.select(profile.uid, key);

    constructor(database) {
        this.api = new Api();
        this.database = database;
    }
}

export default Service;
