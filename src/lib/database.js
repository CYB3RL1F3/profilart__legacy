import { MongoClient } from 'mongodb';
import config from '../config';

export class Database {
    connect () {
        return new Promise((resolve, reject) => {
            MongoClient.connect(config.db.address, function(error, db) {
                if (error || !db) {
                    reject("can't connect to DB");
                } else {
                    resolve(db);
                }
            });
        });
    }

    persist (uid, coll, content) {
        return new Promise((resolve, reject) => {
            this.connect().then((db) => {
                const updated = db.collection(coll, (err, collection) => {
                    const selector = {_id: uid};
                    collection.findAndModify(selector, [], {$set: {"content": content}}, {upsert:true, w:1}, (err, updated) => {
                        db.close();
                        if (updated) {
                            resolve(updated);
                        } else {
                            reject(err);
                        }
                    });
                });
            }).catch((error) => {
                reject(error);
            });
        });

    }

    select (uid, coll) {
        console.log('db request from ' + uid + ' to collection ' + coll);
        return new Promise((resolve, reject) => {
            this.connect().then((db) => {
                const updated = db.collection(coll, (err, collection) => {
                    const selector = {_id: uid};
                    collection.findOne(selector, (err, data) => {
                        db.close();
                        if (data) {
                            resolve(data);
                        } else {
                            reject(err);
                        }
                    });
                });
            }).catch((error) => {
                reject(error);
            });
        });
    }
}

export default Database;
