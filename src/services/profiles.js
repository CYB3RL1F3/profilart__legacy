import sanitize from 'mongo-sanitize';
import { v4 as uuid } from 'uuid';
import Service from '../service';
import err from '../err';
import Encrypter from '../lib/encrypter';
import Mailer from '../lib/mailer';
import Resolvers from '../lib/resolvers';

export class Profiles extends Service {
    profiles = {};
    sessions = {};
    encrypter = {};

    get = async (uid) => {
        const { content } = await this.database.select(uid, 'profiles');
        return content;
    };

    read = (profile) => this.cleanResults(profile);

    getSessionToken = () => uuid();

    login = async (credentials) => {
        try {
            const { content } = await this.database.find(
                { 'content.email': { $eq: sanitize(credentials.email) } },
                'profiles'
            );
            await this.encrypter.check(credentials.password, content.password);
            content.token = this.getSessionToken();
            return this.cleanResults(content);
        } catch (e) {
            throw err(400, 'invalid password');
        }
    };

    forgottenPassword = async (args, credentials) => {
        const data = await this.database.find({ 'content.email': { $eq: sanitize(credentials.email) } }, 'profiles');
        const profile = data.content;
        const newPassword = uuid().substring(0, 8);
        const encryption = await this.encrypter.encrypt(newPassword);
        const update = Object.assign(profile, {
            password: encryption.hash,
            encryption: encryption.encryption
        });
        await this.persist(profile, 'profiles', update);
        try {
            await this.sendPasswordByMail(newPassword, profile);
        } catch (e) {
            throw err(500, 'impossible to send via mail. Configure your mailer...');
        }
        return {
            ok: true
        };
    };

    isEmail = (email) =>
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
            email
        );

    isValid = (profile) =>
        profile &&
        profile.email &&
        this.isEmail(profile.email) &&
        profile.password &&
        profile.artistName &&
        (!profile.RA || (profile.RA && profile.RA.userId && profile.RA.accessKey && profile.RA.DJID)) &&
        (!profile.soundcloud || (profile.soundcloud && profile.soundcloud.url)) &&
        (!profile.discogs || (profile.discogs && profile.discogs.url)) &&
        (!profile.mailer || (profile.mailer && profile.mailer.recipient && this.isEmail(profile.mailer.recipient)));

    create = async (args, profile) => {
        profile = sanitize(profile);
        if (this.isValid(profile)) {
            profile = await this.resolvers.resolveProfile(profile);
            const uid = uuid().substring(0, 8);
            profile.uid = uid;
            const { hash, encryption } = await this.encrypter.encrypt(profile.password);
            profile.password = hash;
            profile.encryption = encryption;
            await this.persist({ uid }, 'profiles', profile);
            this.sendConfirmationByMail(profile);
            return this.cleanResults(profile);
        } else {
            throw err(400, 'invalid payload for profile creation');
        }
    };

    remove = async (profile) => {
        await this.database.remove(profile.uid, 'profiles');
        return { delete: profile.uid };
    };

    update = async (profile, args) => {
        args = sanitize(args);
        if (this.isValid(args)) {
            if (args.uid !== profile.uid) {
                throw err(400, 'illegal operation. Must send corresponding UID.');
                return;
            }
            if (args.newPassword) {
                const isPasswordValid = await this.encrypter.check(args.password, profile.password);
                if (!isPasswordValid) {
                    throw err(400, 'old password required to set a new one');
                    return;
                }
            }
            let update;
            if (args.totalReplace) {
                const { uid, password, encryption } = profile;
                update = Object.assign({}, { uid, password, encryption }, this.replaceFields(args));
            } else {
                update = Object.assign({}, profile, this.replaceFields(args));
            }
            delete update.totalReplace;
            update = await this.resolvers.resolveProfile(update);

            const { encryption, hash } = await this.encrypter.encrypt(update.password);
            update.password = hash;
            update.encryption = encryption;
            const data = await this.persist(profile, 'profiles', update);
            if (data) return this.cleanResults(update);
            throw err(400, 'failed during persisting data');
        } else throw err(400, 'invalid payload for update');
    };

    cleanResults = (profile) => {
        const result = Object.assign({}, profile);
        delete result.password;
        delete result.encryption;
        return result;
    };

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
    };

    sendConfirmationByMail(profile) {
        if (!profile.mailer) return; // only works if a mailer's configured
        const mailer = new Mailer(profile);
        mailer.send('creation.html', {
            subject: `welcome on Profilart, ${profile.artistName}`,
            name: profile.artistName,
            email: profile.email,
            profile
        });
    }

    sendPasswordByMail(newPassword, profile) {
        const mailer = new Mailer(profile);
        return mailer.send('password.html', {
            subject: `forgotten password, ${profile.artistName}`,
            name: profile.artistName,
            email: profile.email,
            profile,
            newPassword
        });
    }

    constructor(database) {
        super(database);
        this.encrypter = new Encrypter();
        this.resolvers = new Resolvers();
    }
}

export default Profiles;
