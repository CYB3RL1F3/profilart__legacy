import { Strategy, ExtractJwt, JwtFromRequestFunction } from "passport-jwt";
import jwt from "jsonwebtoken";
import redis from "redis";
import config from "./config";
import * as Sentry from "@sentry/node";
import { Request } from "express";
import { Credentials, AuthenticatedProfileResponseModel } from "model/profile";
import { AuthenticatedProfileModel } from "./model/profile";

interface Options {
  jwtFromRequest: JwtFromRequestFunction;
  secretOrKey: string;
  passReqToCallback: boolean;
}

interface AuthenticationPayload {
  email: string;
  authenticated: boolean;
  signature: string;
  id: string;
}

export class Authenticator {
  opts = (): Options => ({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ...config.jwt
  });

  authenticate = async (
    credentials: Credentials,
    req: Request,
    withMethod: (
      credentials: Credentials
    ) => Promise<AuthenticatedProfileResponseModel>
  ) => {
    const { email, password } = credentials;
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
      req.store.hset(
        config.redis.collection,
        profile.uid,
        JSON.stringify(profile),
        redis.print
      );
      delete profile.token;
      return {
        authenticated: true,
        token,
        profile
      };
    } catch (e) {
      Sentry.withScope((scope) => {
        scope.setExtra("authenticate", e);
        Sentry.captureException(e);
      });
      throw e;
    }
  };

  getStrategy = (): Strategy =>
    new Strategy(
      this.opts(),
      async (req: Request, payload: AuthenticationPayload, done) => {
        const { email, authenticated, signature, id } = payload;
        const profile = await new Promise<AuthenticatedProfileModel>(
          (resolve) =>
            req.store.hget(config.redis.collection, id, (err, result) => {
              result && !err ? resolve(JSON.parse(result)) : resolve(null);
            })
        );
        if (
          authenticated &&
          profile &&
          profile.uid === id &&
          profile.email === email &&
          profile.token === signature
        ) {
          req.params.uid = id;
          return done(null, JSON.stringify(profile));
        } else {
          return done(null, false);
        }
      }
    );
}

export default Authenticator;
