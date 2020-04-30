require("module-alias/register");

/* eslint-disable no-console */
import * as bodyParser from "body-parser";
import Redis from "redis";
import express from "express";
import { createServer } from "http";
import Router from "./router";
import config from "./config";
import passport from "passport";
import cors from "cors";
import { alarmClock } from "./lib/alarm";
import { init as sentry, Handlers } from "@sentry/node";

const Ddos = require("ddos");

sentry({
  dsn: config.sentry.dsn
});

// initialization
const app = express();

// redis init
const { redis } = config;
const redisStore = Redis.createClient(redis.store);
redisStore.on("connect", function () {
  console.log("Redis client connected");
});

redisStore.on("error", function (err) {
  console.log("Something went wrong " + err);
});

// DDOS protection
const ddos = new Ddos({
  burst: 3,
  limit: 6,
  maxexpiry: 10,
  trustProxy: true,
  onDenial: (req) => {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);
    req.res.status(429).end(
      JSON.stringify({
        error: 429,
        message: `too many request with IP ${ip}`
      })
    );
  }
});

let port = process.env.PORT || 3000;

app.set("port", port);

// manage bad queries...
app.use((req, res, next) => {
  if (req.headers.host.startsWith('www.')) {
    const newHost = req.headers.host.slice(4)
    return res.redirect(
      301,
      `https://${newHost}${req.originalUrl}`,
    );
  }
});

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.use(Handlers.requestHandler());

app.use(cors());
app.use((req, res, next) => {
  if (/(.css)/g.test(req.path)) {
    res.setHeader("Content-Type", "text/css");
    return next();
  }
  if (/(.jpg)/g.test(req.path)) {
    res.setHeader("Content-Type", "image/jpeg");
    return next();
  }
  if (/(.ico)/g.test(req.path)) {
    res.setHeader("Content-Type", "image/x-icon");
    return next();
  }
  if (req.path === "/") {
    res.setHeader("Content-Type", "text/html");
    return next();
  }
  if (req.path === "/swagger") {
    res.setHeader("Content-Type", "text/html");
    return next();
  }
  res.setHeader("Content-Type", "application/json");
  return next();
});

app.use(ddos.express);
app.use(express.static("public"));
app.use(passport.initialize());

const listen = () => {
  const server = createServer(app);
  const router = new Router(app, redisStore);
  router.init();
  server.listen(port, () => {
    console.log("Listening on %d", port);
    alarmClock();
  });
};

listen();
