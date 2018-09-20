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
                    create: this.profiles.create,
                    contact: contact.mail,
                    login: this.authenticate
                }
            },
            auth: {
                get: {
                    profile: this.profiles.read
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
                console.log('here');
                const { email, authenticated, signature, id } = payload;
                console.log(payload);
                const p = await new Promise((resolve) =>
                    req.store.hget(config.redis.collection, id, (err, result) => {
                        console.log(result);
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

    authenticate = async (p, body, req) => {
        const { email, password } = body;
        try {
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
            console.log('here');
            return {
                authenticated: true,
                token,
                profile
            };
        } catch (e) {
            throw e;
        }
    };

    fail = (res, e) => {
        const err = JSON.parse(e.message);
        res.status(err.code).send(
            JSON.stringify({
                error: {
                    code: 404,
                    message: err.message
                }
            })
        );
    };

    initRoutes() {
        this.initPublicRoutes();
        this.initAuthRoutes();
        this.init404();
    }

    run = async (req, query, service, dataProvider) => {
        let profile = null;
        if (service !== 'login' && service !== 'create') {
            try {
                const { uid } = req.params;
                profile = await this.profiles.get(uid);
                if (!profile) throw err(400, 'profile not found');
                this.validator.checkProfile(profile, service);
            } catch (e) {
                throw err(404, 'profile not found');
                return;
            }
        }
        try {
            const response = await query(profile, dataProvider, req);
            console.log('passs  ', response);
            return response;
        } catch (e) {
            throw e;
        }
    };

    initPublicRoutes() {
        // GET requests
        Object.keys(this.services.public.get).forEach((service) => {
            this.app.get(`/:uid/${service}`, async (req, res) => {
                try {
                    const query = this.services.public.get[service];
                    const result = await this.run(req, query, service, req.query);
                    res.status(200).send(JSON.stringify(result));
                } catch (e) {
                    this.fail(res, e);
                }
            });
        });

        // POST requests
        Object.keys(this.services.public.post).forEach((service) => {
            this.app.post(`/${service}`, async (req, res) => {
                try {
                    console.log('HEEEERREE !!!');
                    const query = this.services.public.post[service];
                    console.log(query);
                    const result = await this.run(req, query, service, req.body);
                    res.status(200).send(JSON.stringify(result));
                } catch (e) {
                    this.fail(res, e);
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
                            this.runAuthQuery(services[service], service, true)
                        );
                        break;
                    case 'post':
                        this.app.post(
                            uri,
                            passport.authenticate('jwt', { session: false }),
                            this.runAuthQuery(services[service], service, false)
                        );
                        break;
                    case 'patch':
                        this.app.patch(
                            uri,
                            passport.authenticate('jwt', { session: false }),
                            this.runAuthQuery(services[service], service, false)
                        );
                        break;
                    case 'delete':
                        this.app.delete(
                            uri,
                            passport.authenticate('jwt', { session: false }),
                            this.runAuthQuery(services[service], service, false)
                        );
                        break;
                }
            });
        });
    }

    init404 = () => {
        this.app.get('*', (req, res) => {
            this.fail(res, err(404, 'this endpoint does not exist'));
        });
    };

    runAuthQuery = (query, service, isGet) => async (req, res) => {
        try {
            const result = await this.run(req, query, service, isGet ? req.query : req.body);
            console.log('PASS PAR ICI !!', result);
            res.status(200).send(JSON.stringify(result));
        } catch (e) {
            this.fail(res, e);
        }
    };
}

export default Router;
