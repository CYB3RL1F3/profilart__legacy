/* eslint-disable no-console */
//const WebSocket = require('ws').Server;

import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import Application from './application';

// initialization
const app = express();
let port = process.env.PORT || 3000;
let tries = 0;
app.set('port', port);

app.use(express.static('public'));

const server = http.createServer(app);
const ws = new WebSocket.Server({ server });
const application = new Application();

ws.on('connection', (socket) => {
   console.info('websocket connection open');
   socket.on('message', (data) => {
      application.run(data, socket);
   });
   socket.on('close', (reason) => {
       console.log('socket disconnected');
   });
});

const listen = () => {
  server.listen(port, () => {
    console.log('Listening on %d', server.address().port);
  });
}

ws.on('error', () => {
  port++;
  tries++;
  if (tries > 3) return;
  listen();
});


listen();
