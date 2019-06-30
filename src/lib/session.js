export class Sessions {
  sessions = {};

  getTokenBySessionId(socketId) {
    return this.sessions[`s${socketId}`];
  }

  addSession(socketId, token) {
    this.sessions[`s${socketId}`] = token;
  }

  removeSession(socketId) {
    delete this.sessions[`s${socketId}`];
  }

  removeSessionByTokenId(token) {
    this.sessions.map((t, socketId) => {
      if (t === token) {
        delete this.sessions[socketId];
      }
    });
  }
}

export default Sessions;
