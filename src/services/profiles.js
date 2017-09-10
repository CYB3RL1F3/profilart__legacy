import config from '../config';
import Service from '../service';
import err from '../err';
import { v4 as uuid } from 'uuid';
import Encrypter from '../lib/encrypter';

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
        && profile.password
        && (!profile.RA || (
            profile.RA &&
            profile.RA.userId &&
            profile.RA.accessKey &&
            profile.RA.DJID &&
            profile.artistName
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
                    resolve(uid);
                }).catch(reject);
            }).catch(reject);
        } else {
            reject(err(400, 'invalid payload for profile creation'));
        }
    })

    update = (profile, args) => new Promise((resolve, reject) => {
        if (this.isValid(args)) {
            console.log(args.password);
            this.encrypter.check(args.password, profile.password).then((res) => {
                if (res) {
                    args.uid = profile.uid;
                    // add new password
                    if (args.newPassword) {
                        args.password = args.newPassword;
                        delete args.newPassword;
                    }
                    this.encrypter.encrypt(args.password).then((encryption) => {
                        args.password = encryption.hash;
                        args.encryption = encryption.encryption;
                        this.persist(profile, 'profiles', args).then((data) => {
                            this.profiles[profile.uid] = args;
                            this.profiles[profile.uid].uid = profile.uid;
                            delete args.password;
                            delete args.encryption;
                            resolve(args);
                        }).catch(reject);
                    }).catch(reject);

                } else {
                    reject(err(400, 'invalid password. Couldn\'t complete changes'));
                }
            }).catch(err(400, 'invalid password. Couldn\t complete changes'));
        } else {
            reject(err(400, 'invalid payload for profile update'));
        }
    })

    constructor (database) {
        super(database);
        this.encrypter = new Encrypter();
    }
}

export default Profiles;
