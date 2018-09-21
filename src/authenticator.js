import { Strategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import redis from 'redis';
import config from './config';

export class Authenticator {
    opts = () => ({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ...config.jwt
    });

    authenticate = async (body, req, withMethod) => {
        const { email, password } = body;
        try {
            const profile = await withMethod({ email, password });
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
            return {
                authenticated: true,
                token,
                profile
            };
        } catch (e) {
            throw e;
        }
    };

    getStrategy = () =>
        new Strategy(this.opts(), async (req, payload, done) => {
            const { email, authenticated, signature, id } = payload;
            const p = await new Promise((resolve) =>
                req.store.hget(config.redis.collection, id, (err, result) => {
                    result && !err ? resolve(result) : resolve(false);
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
        });
}

export default Authenticator;
