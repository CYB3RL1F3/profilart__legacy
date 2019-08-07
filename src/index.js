/* eslint-disable no-console */
import express from "express";
import bodyParser from "body-parser";
import Redis from "redis";
import http from "http";
import Router from "./router";
import config from "./config";
import passport from "passport";
import cors from "cors";
import { snoose } from "./lib/snoose";
import * as Sentry from "@sentry/node";
const Ddos = require("ddos");

Sentry.init({
  dsn: config.sentry.dsn
});

// initialization
const app = express();

// redis init
const { redis } = config;
const redisStore = Redis.createClient(redis.store);
redisStore.on("connect", function() {
  console.log("Redis client connected");
});

redisStore.on("error", function(err) {
  console.log("Something went wrong " + err);
});

// DDOS protection
const ddos = new Ddos({
  burst: 3,
  limit: 6,
  maxexpiry: 10,
  trustProxy: true,
  onDenial: req => {
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

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(ddos.express);

app.use(Sentry.Handlers.requestHandler());

app.use(cors());
app.use((req, res, next) => {
  req.store = redisStore;
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
  res.setHeader("Content-Type", "application/json");
  return next();
});

app.use(express.static("public"));
app.use(passport.initialize());

const listen = () => {
  const server = http.createServer(app);
  const router = new Router(app);
  router.init();
  server.listen(port, () => {
    console.log("Listening on %d", server.address().port);
    snoose();
  });
};

listen();
