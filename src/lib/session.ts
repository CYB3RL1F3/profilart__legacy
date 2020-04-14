export class Sessions {
  sessions = {};

  getTokenBySessionId(socketId: number) {
    return this.sessions[`s${socketId}`];
  }

  addSession(socketId: number, token: string) {
    this.sessions[`s${socketId}`] = token;
  }

  removeSession(socketId) {
    delete this.sessions[`s${socketId}`];
  }

  removeSessionByTokenId(token) {
    Object.keys(this.sessions).map((socketId) => {
      const t = this.sessions[socketId];
      if (t === token) {
        delete this.sessions[socketId];
      }
    });
  }
}

export default Sessions;
