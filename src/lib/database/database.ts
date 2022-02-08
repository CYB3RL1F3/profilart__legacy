import {
  MongoClient,
  InsertOneWriteOpResult,
  FilterQuery,
  WriteOpResult,
  FindAndModifyWriteOpResultObject
} from "mongodb";
import sanitize from "mongo-sanitize";
import config from "../../config";
import err from "../../err";
import { withScope, captureException } from "@sentry/node";

import { Data, Selectable } from "./database.d";

export class Database {
  connect = (): Promise<MongoClient> =>
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
        { useNewUrlParser: true, useUnifiedTopology: true },
        (error, db) => {
          if (error || !db) {
            reject(err(500, "can't connect to DB"));
          } else {
            resolve(db);
          }
        }
      );
    });

  persist = <Coll>(uid: string, coll: string, content: Coll) =>
    new Promise<FindAndModifyWriteOpResultObject<Data<Coll>>>(
      async (resolve, reject) => {
        try {
          uid = sanitize(uid);
          const client = await this.connect();
          const db = client.db(config.db.base);
          db.collection<Data<Coll>>(coll, (err, collection) => {
            const selector: Selectable = { _id: uid };
            if (!collection && err) return reject(err);
            collection.findOneAndUpdate(
              selector,
              { $set: { content: sanitize<Coll>(content) } },
              { upsert: true, w: 1 },
              (err, updated) => {
                client.close();
                if (updated) {
                  resolve(updated);
                } else {
                  console.log(err);
                  reject(err);
                }
              }
            );
          });
        } catch (e) {
          withScope((scope) => {
            scope.setExtra("persist database", e);
            captureException(e);
          });
          reject(e);
        }
      }
    );

  insert = <Coll>(coll: string, content: Data<Coll>) =>
    new Promise<InsertOneWriteOpResult<any>>(async (resolve, reject) => {
      try {
        const client = await this.connect();
        const db = client.db(config.db.base);
        db.collection<Data<Coll>>(coll, (err, collection) => {
          if (!collection && err) return reject(err);
          collection.insertOne(content, (err, inserted) => {
            client.close();
            if (inserted) {
              resolve(inserted);
            } else {
              reject(err);
            }
          });
        });
      } catch (e) {
        withScope((scope) => {
          scope.setExtra("insert database", e);
          captureException(e);
        });
        reject(e);
      }
    });

  find = <Coll>(selector: FilterQuery<Data<Coll>>, coll: string) =>
    new Promise<Data<Coll>>(async (resolve, reject) => {
      try {
        const client = await this.connect();
        const db = client.db(config.db.base);
        db.collection<Data<Coll>>(coll, (err, collection) => {
          if (!collection && err) return reject(err);
          collection.findOne(
            selector,
            { limit: 1 },
            (err, data) => {
              client.close();
              if (data) {
                resolve(data);
              } else {
                reject(err);
              }
            }
          );
        });
      } catch (e) {
        withScope((scope) => {
          scope.setExtra("find database", e);
          captureException(e);
        });
        reject(e);
      }
    });
  
  findAll = <Coll>(selector: FilterQuery<Data<Coll>>, coll: string) =>
    new Promise<Data<Coll>[]>(async (resolve, reject) => {
      try {
        const client = await this.connect();
        const db = client.db(config.db.base);
        db.collection<Data<Coll>>(coll, (err, collection) => {
          if (!collection && err) return reject(err);
          const content = collection.find(selector).toArray();
          resolve(content);
        });
      } catch (e) {
        withScope((scope) => {
          scope.setExtra("find database", e);
          captureException(e);
        });
        reject(e);
      }
    });

  remove = <Coll>(uid: string, coll: string) =>
    new Promise<WriteOpResult>(async (resolve, reject) => {
      try {
        uid = sanitize(uid);
        const client = await this.connect();
        const db = client.db(config.db.base);
        db.collection<Coll>(coll, (error, collection) => {
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
        withScope((scope) => {
          scope.setExtra("remove database", e);
          captureException(e);
        });
        reject(e);
      }
    });

  select = async <Coll>(uid: string, coll: string) =>
    await this.find<Coll>({ _id: sanitize(uid) }, coll);
}

export default Database;
