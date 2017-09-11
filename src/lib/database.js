import { MongoClient } from 'mongodb';
import sanitize from 'mongo-sanitize';
import config from '../config';
import err from '../err';

export class Database {
    connect = () => new Promise((resolve, reject) => {
        if (!config.db.address) {
            reject(err(500, 'can\'t connect to DB : no MONGODB_URI env variable provided.'));
        }
        MongoClient.connect(config.db.address, function(error, db) {
            if (error || !db) {
                reject(err(500, 'can\'t connect to DB'));
            } else {
                resolve(db);
            }
        });
    });

    persist = (uid, coll, content) => new Promise((resolve, reject) => {
        uid = sanitize(uid);
        this.connect().then((db) => {
            const updated = db.collection(coll, (err, collection) => {
                const selector = {_id: uid};
                collection.findAndModify(selector, [], {$set: {'content': sanitize(content)}}, {new: true, upsert:true, w:1}, (err, updated) => {
                    db.close();
                    if (updated) {
                        resolve(updated);
                    } else {
                        reject(err);
                    }
                });
            });
        }).catch(reject);
    });

    insert = (coll, content) => new Promise((resolve, reject) => {
        this.connect().then((db) => {
            const updated = db.collection(coll, (err, collection) => {
                collection.insertOne({'content': content}, (err, inserted) => {
                    db.close();
                    if (inserted) {
                        resolve(inserted);
                    } else {
                        reject(err);
                    }
                });
            });
        }).catch(reject);
    });

    find = (selector, coll) => new Promise((resolve, reject) => {
        this.connect().then((db) => {
            const updated = db.collection(coll, (err, collection) => {
                collection.findOne(selector, (err, data) => {
                    db.close();
                    if (data) {
                        resolve(data);
                    } else {
                        reject(err);
                    }
                });
            });
        }).catch(reject);
    });

    select = (uid, coll) => this.find({_id: sanitize(uid)}, coll)
}

export default Database;
