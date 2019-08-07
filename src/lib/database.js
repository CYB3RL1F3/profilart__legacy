import { MongoClient } from "mongodb";
import sanitize from "mongo-sanitize";
import config from "../config";
import err from "../err";
import * as Sentry from "@sentry/node";

export class Database {
  connect = () =>
    new Promise((resolve, reject) => {
      if (!config.db.address) {
        reject(
          err(
            500,
            "can't connect to DB : no MONGODB_URI env variable provided."
          )
        );
      }
      MongoClient.connect(
        config.db.address,
        { useNewUrlParser: true },
        function(error, db) {
          if (error || !db) {
            reject(err(500, "can't connect to DB"));
          } else {
            resolve(db);
          }
        }
      );
    });

  persist = (uid, coll, content) =>
    new Promise(async (resolve, reject) => {
      try {
        uid = sanitize(uid);
        const client = await this.connect();
        const db = client.db(config.db.base);
        db.collection(coll, (err, collection) => {
          const selector = { _id: uid };
          if (!collection && err) return reject(err);
          collection.findOneAndUpdate(
            selector,
            { $set: { content: sanitize(content) } },
            { new: true, upsert: true, w: 1 },
            (err, updated) => {
              client.close();
              if (updated) {
                resolve(updated);
              } else {
                reject(err);
              }
            }
          );
        });
      } catch (e) {
        Sentry.withScope(scope => {
          scope.setExtra("persist database", e);
          Sentry.captureException(e);
        });
        reject(e);
      }
    });

  insert = (coll, content) =>
    new Promise(async (resolve, reject) => {
      try {
        const client = await this.connect();
        const db = client.db(config.db.base);
        db.collection(coll, (err, collection) => {
          if (!collection && err) return reject(err);
          collection.insertOne({ content: content }, (err, inserted) => {
            client.close();
            if (inserted) {
              resolve(inserted);
            } else {
              reject(err);
            }
          });
        });
      } catch (e) {
        Sentry.withScope(scope => {
          scope.setExtra("insert database", e);
          Sentry.captureException(e);
        });
        reject(e);
      }
    });

  find = (selector, coll) =>
    new Promise(async (resolve, reject) => {
      try {
        const client = await this.connect();
        const db = client.db(config.db.base);
        db.collection(coll, (err, collection) => {
          if (!collection && err) return reject(err);
          collection.findOne(selector, { limit: 1 }, (err, data) => {
            client.close();
            if (data) {
              resolve(data);
            } else {
              reject(err);
            }
          });
        });
      } catch (e) {
        Sentry.withScope(scope => {
          scope.setExtra("find database", e);
          Sentry.captureException(e);
        });
        reject(e);
      }
    });

  remove = (uid, coll) =>
    new Promise(async (resolve, reject) => {
      try {
        uid = sanitize(uid);
        const client = await this.connect();
        const db = client.db(config.db.base);
        db.collection(coll, (error, collection) => {
          if (error) reject(error);
          const selector = { _id: uid };
          collection.remove(selector, (err, deleted) => {
            client.close();
            if (deleted) {
              resolve(deleted);
            } else {
              reject(err);
            }
          });
        });
      } catch (e) {
        Sentry.withScope(scope => {
          scope.setExtra("remove database", error);
          Sentry.captureException(error);
        });
        reject(e);
      }
    });

  select = async (uid, coll) => await this.find({ _id: sanitize(uid) }, coll);
}

export default Database;
