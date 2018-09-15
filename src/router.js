import passport from 'passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import redis from 'redis';

import ResidentAdvisor from './services/residentadvisor';
import Discogs from './services/discogs';
import Contact from './services/contact';
import Soundcloud from './services/soundcloud';
import Validator from './lib/validator';
import Database from './lib/database';
import Profiles from './services/profiles';
import All from './services/all';
import config from './config';
import { err } from './err';

export class Router {
    services = {};
    authenticator = null;

    constructor(app) {
        this.app = app;
    }

    init() {
        this.initServices();
        this.initMiddlewares();
        this.initRoutes();
    }

    initServices() {
        const database = new Database();
        const residentAdvisor = new ResidentAdvisor(database);
        const discogs = new Discogs(database);
        const soundcloud = new Soundcloud(database);
        const contact = new Contact();
        const all = new All(database, residentAdvisor, discogs, soundcloud);
        this.validator = new Validator();
        this.profiles = new Profiles(database);

        // fill services dictionnary with different ones
        this.services = {
            public: {
                get: {
                    charts: residentAdvisor.getCharts,
                    events: residentAdvisor.getEvents,
                    infos: residentAdvisor.getInfos,
                    tracks: soundcloud.getTracks,
                    releases: discogs.getReleases,
                    all: all.get
                },
                post: {
                    contact: contact.mail
                }
            },
            auth: {
                get: {
                    profile: this.profiles.read
                },
                post: {
                    create: this.profiles.create
                },
                patch: {
                    update: this.profiles.update,
                    password: this.profiles.forgottenPassword
                },
                delete: {
                    remove: this.profiles.remove
                }
            }
        };
    }

    initMiddlewares() {
        const opts = {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ...config.jwt
        };
        passport.use(
            new Strategy(opts, async (req, payload, done) => {
                const { email, authenticated, signature, id } = payload;
                const p = await new Promise((resolve) =>
                    req.store.hget(config.redis.collection, id, (err, result) => {
                        result ? resolve(result) : resolve(false);
                    })
                );
                if (!p) return done(null, false);
                const profile = JSON.parse(p);
                if (
                    authenticated &&
                    profile &&
                    profile.uid === id &&
                    profile.email === email &&
                    profile.token === signature
                ) {
                    req.params.uid = id;
                    return done(null, p);
                } else {
                    return done(null, false);
                }
            })
        );
    }

    authenticate = async (req, res) => {
        const { email, password } = req.body;
        const profile = await this.profiles.login({ email, password });
        const token = jwt.sign(
            {
                authenticated: true,
                id: profile.uid,
                signature: profile.token,
                email
            },
            config.jwt.secretOrKey
        );
        req.store.hset(config.redis.collection, profile.uid, JSON.stringify(profile), redis.print);
        delete profile.token;
        res.status(200).send(
            JSON.stringify({
                authenticated: true,
                token,
                signature: profile.token,
                profile
            })
        );
    };

    initRoutes() {
        this.initPublicRoutes();
        this.initAuthRoutes();
    }

    run = async (req, query, service) => {
        const { uid } = req.params;
        const profile = await this.profiles.get(uid);
        this.validator.checkProfile(profile, service);
        const response = await query(profile, req.query);
        console.log('passs  ', response);
        return response;
    };

    initPublicRoutes() {
        this.app.post('/login', this.authenticate);
        Object.keys(this.services.public.get).forEach((service) => {
            this.app.get(`/:uid/${service}`, async (req, res) => {
                try {
                    const query = this.services.public.get[service];
                    const result = await this.run(req, query, service);
                    res.status(200).send(JSON.stringify(result));
                } catch (e) {
                    res.status(400).send(e.message);
                }
            });
        });
    }

    initAuthRoutes() {
        Object.keys(this.services.auth).forEach((method) => {
            const services = this.services.auth[method];
            Object.keys(services).forEach((service) => {
                const uri = `/${service}`;
                switch (method) {
                    case 'get':
                        this.app.get(
                            uri,
                            passport.authenticate('jwt', { session: false }),
                            this.runAuthQuery(services[service])
                        );
                        break;
                    case 'post':
                        this.app.post(
                            uri,
                            passport.authenticate('jwt', { session: false }),
                            this.runAuthQuery(services[service])
                        );
                        break;
                    case 'patch':
                        this.app.patch(
                            uri,
                            passport.authenticate('jwt', { session: false }),
                            this.runAuthQuery(services[service])
                        );
                        break;
                    case 'delete':
                        this.app.delete(
                            uri,
                            passport.authenticate('jwt', { session: false }),
                            this.runAuthQuery(services[service])
                        );
                        break;
                }
            });
        });
    }

    runAuthQuery = (query) => async (req, res) => {
        try {
            const result = await this.run(req, query);
            res.status(200).send(JSON.stringify(result));
        } catch (e) {
            res.status(code).send(e);
        }
    };
}

export default Router;
