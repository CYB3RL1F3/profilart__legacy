import config from '../config';
import Service from '../service';
import err from '../err';
import { v4 as uuid } from 'uuid';
import Encrypter from '../lib/encrypter';
import Mailer from '../lib/mailer';

export class Profiles extends Service {

    profiles = {};
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
        const prfl = Object.assign({}, profile);
        delete prfl.password;
        delete prfl.encryption;
        resolve(prfl);
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

    create = (args, profile) => new Promise((resolve, reject) => {
        if (this.isValid(profile)) {
            const uid = uuid().substring(0, 8);
            profile.uid = uid;
            this.encrypter.encrypt(profile.password).then((encryption) => {
                profile.password = encryption.hash;
                profile.encryption = encryption.encryption;
                this.persist({uid}, 'profiles', profile).then((data) => {
                    this.sendConfirmationByMail(profile);
                    resolve(this.cleanResults(profile));
                }).catch(reject);
            }).catch(reject);
        } else {
            reject(err(400, 'invalid payload for profile creation'));
        }
    })

    update = (profile, args) => new Promise((resolve, reject) => {
        this.encrypter.check(args.password, profile.password).then((res) => {
            if (res) {
                const update = Object.assign({}, profile, this.replaceFields(args));
                this.encrypter.encrypt(update.password).then((encryption) => {
                    update.password = encryption.hash;
                    update.encryption = encryption.encryption;
                    this.persist(profile, 'profiles', update).then((data) => {
                        this.profiles[profile.uid] = update;
                        resolve(this.cleanResults(update));
                    }).catch(reject);
                }).catch(reject);
            } else {
                reject(err(400, 'invalid password. Couldn\'t complete changes'));
            }
        }).catch(err(400, 'invalid password. Couldn\t complete changes'));
    })

    cleanResults = (profile) => {
        const result = Object.assign({}, profile);
        delete result.password;
        delete result.encryption;
        return result;
    }

    replaceFields = (profile) => {
        // add new password
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

    constructor (database) {
        super(database);
        this.encrypter = new Encrypter();
    }
}

export default Profiles;
