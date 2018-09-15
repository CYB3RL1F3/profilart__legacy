/* eslint-disable no-console */
import express from 'express';
import bodyParser from 'body-parser';
import Redis from 'redis';
import http from 'http';
import Router from './router';
import config from './config';
import passport from 'passport';
import { snoose } from './lib/snoose';
// initialization
const app = express();

// redis init
const { redis } = config;
const redisStore = Redis.createClient(redis.store);
redisStore.on('connect', function() {
    console.log('Redis client connected');
});

redisStore.on('error', function(err) {
    console.log('Something went wrong ' + err);
});

let port = process.env.PORT || 3000;
app.set('port', port);

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use((req, res, next) => {
    req.store = redisStore;
    return next();
});

app.use(express.static('public'));
app.use(passport.initialize());

const listen = () => {
    const server = http.createServer(app);
    const router = new Router(app);
    router.init();
    server.listen(port, () => {
        console.log('Listening on %d', server.address().port);
        snoose();
    });
};

listen();
