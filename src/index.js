/* eslint-disable no-console */
//const WebSocket = require('ws').Server;

import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import Application from './application';

// initialization
const app = express();

app.use(function (req, res) {
  res.send("<html><body style='margin: 0; padding: 10px; background: #ECECEC; width: 100%; height: 100%; font-family: arial;'><h1>API</p><h4 style='color: #DE1212;'>Because websockets are the future, Cyberlife's webservice is only available that way.</h4></body></html>");
});

const server = http.createServer(app);
const ws = new WebSocket.Server({ server });
const application = new Application();

ws.on("connection", (socket) => {
   console.info("websocket connection open");
   socket.on("message", (data) => {
      application.run(data, socket);
   });
   socket.on("close", (reason) => {
       console.log("socket disconnected");
   });
});

server.listen(3000, () => {
  console.log('Listening on %d', server.address().port);
});
