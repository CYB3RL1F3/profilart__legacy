import config from '../config';
import Service from '../service';
import err from '../err';
import { v4 as uuid } from 'uuid';
import Encrypter from '../lib/encrypter';
import Mailer from '../lib/mailer';
import sanitize from 'mongo-sanitize';

export class Profiles extends Service {

    profiles = {};
    sessions = {};
    encrypter = {};

    get = (uid) => new Promise((resolve, reject) => {
        if (this.profiles[uid]) {
            resolve(this.profiles[uid]);
        } else {
            this.database.select(uid, 'profiles').then((profile) => {
                profile.content.uid = uid;
                this.profiles[uid] = profile.content;
                resolve(profile.content);
            }).catch((e) => {
                reject(err(401, 'profile not found'));
            })
        }
    });

    read = (profile) => new Promise((resolve, reject) => {
        resolve(this.cleanResults(profile));
    })

    getSessionToken = () => uuid();

    login = (args, credentials, sender) => new Promise((resolve, reject) => {
        this.database.find({'content.email': {$eq: sanitize(credentials.email)}}, 'profiles').then((data) => {
            const profile = data.content;
            this.encrypter.check(credentials.password, profile.password).then((res) => {
                resolve(this.cleanResults(profile, sender));
            }).catch((e) => reject(err(400, 'invalid password')))
        }).catch((e) => reject(err(400, 'inexisting account')));
    })

    isValid = (profile) => profile
        && profile.email
        && profile.password
        && profile.artistName
        && (!profile.RA || (
            profile.RA &&
            profile.RA.userId &&
            profile.RA.accessKey &&
            profile.RA.DJID
        ))
        && (!profile.soundcloud || (
          profile.soundcloud && (
            profile.soundcloud.id &&
            profile.soundcloud.clientId &&
            profile.soundcloud.clientSecret
          )
        ))
        && (!profile.mailer || (
            profile.mailer &&
            profile.mailer.recipient &&
            profile.mailer.use &&
            (!profile.mailer.nodemail || (
                profile.mailer.nodemail &&
                profile.mailer.nodemail.service &&
                profile.mailer.nodemail.host &&
                profile.mailer.nodemail.auth &&
                profile.mailer.nodemail.auth.user &&
                profile.mailer.nodemail.auth.pass
            )) &&
            (!profile.mailer.mailgun || (
                profile.mailer.mailgun &&
                profile.mailer.mailgun.endpoint &&
                profile.mailer.mailgun.email
            ))
        ));

    create = (args, profile, sender) => new Promise((resolve, reject) => {
        args = sanitize(args);
        if (this.isValid(profile)) {
            const uid = uuid().substring(0, 8);
            profile.uid = uid;
            this.encrypter.encrypt(profile.password).then((encryption) => {
                profile.password = encryption.hash;
                profile.encryption = encryption.encryption;
                this.persist({uid}, 'profiles', profile).then((data) => {
                    this.sendConfirmationByMail(profile);
                    resolve(this.cleanResults(profile, sender));
                }).catch(reject);
            }).catch(reject);
        } else {
            reject(err(400, 'invalid payload for profile creation'));
        }
    })

    remove = (profile, args, sender) => new Promise((resolve, reject) => {
        args = sanitize(args);
        console.log(args);
        const token = this.sessions.getTokenBySessionId(sender.getId());
        if (!token || !args.token || (token !== args.token)) reject(err(400, 'invalid security token !! Couldn\'t complete changes'));
        this.encrypter.check(args.password, profile.password).then((res) => {
            if (res) {
                console.log(args.uid);
                this.database.remove(profile.uid, 'profiles').then((deleted) => {
                  if (deleted) {
                    this.sessions.removeSession(sender.getId());
                    resolve({uid: profile.uid});
                  } else {
                    reject({uid: profile.uid});
                  }
                }).catch(reject);
            } else {
                reject(err(400, 'invalid password. Couldn\'t complete changes'));
            }
        }).catch(err(400, 'invalid password. Couldn\t complete changes'));
    })

    update = (profile, args, sender) => new Promise((resolve, reject) => {
        args = sanitize(args);
        if (this.isValid(args)) {
          const token = this.sessions.getTokenBySessionId(sender.getId());
          if (!token || !args.token || (token !== args.token)) reject(err(400, 'invalid security token !! Couldn\'t complete changes'));
          this.encrypter.check(args.password, profile.password).then((res) => {
              if (res) {
                  let update;
                  if (args.totalReplace) {
                      const { uid, password, encryption } = profile;
                      update = Object.assign({}, { uid, password, encryption }, this.replaceFields(args));
                  } else {
                      update = Object.assign({}, profile, this.replaceFields(args));
                  }
                  delete args.totalReplace;
                  this.encrypter.encrypt(update.password).then((encryption) => {
                      update.password = encryption.hash;
                      update.encryption = encryption.encryption;
                      this.persist(profile, 'profiles', update).then((data) => {
                          this.profiles[profile.uid] = update;
                          resolve(this.cleanResults(update, sender));
                      }).catch(reject);
                  }).catch(reject);
              } else {
                  reject(err(400, 'invalid password. Couldn\'t complete changes'));
              }
          }).catch(err(400, 'invalid password. Couldn\t complete changes'));
        } else {
            reject(err(400, 'invalid payload for update'));
        }
    })

    cleanResults = (profile, sender) => {
        const result = Object.assign({}, profile);
        if (sender) {
            result.token = this.getSessionToken();
            this.sessions.addSession(sender.getId(), result.token);
        }
        delete result.password;
        delete result.encryption;
        return result;
    }

    replaceFields = (profile) => {
        // add new password
        delete profile.token;
        const keys = new Array('Email', 'Password');
        keys.forEach((key) => {
            const newKey = `new${key}`;
            if (profile[newKey]) {
                profile[key.toLowerCase()] = profile[newKey];
                delete profile[newKey];
            }
        });
        return profile;
    }

    sendConfirmationByMail (profile) {
        if (!profile.mailer) return; // only works if a mailer's configured
        const mailer = new Mailer(profile);
        mailer.send('creation.html', {
            subject: `welcome on Profilart, ${profile.artistName}`,
            name: profile.artistName,
            email: profile.email,
            profile
        })
    }

    constructor (database, sessions) {
        super(database);
        this.sessions = sessions;
        this.encrypter = new Encrypter();
    }
}

export default Profiles;
