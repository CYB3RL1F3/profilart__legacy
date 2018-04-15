export class Sender {

    socket = {}

    constructor (socket, id) {
        this.socket = socket;
        this.socketId = id;
    }

    getSocket = () => this.socket;
    getId = () => this.socketId;

    send (query, data) {
        this.socket.send(JSON.stringify({
            status: 1,
            query,
            data
        }))
    }

    error (code, message, query) {
        this.socket.send(JSON.stringify({
            status: 0,
            query,
            error: {
                code,
                message: message || 'an error occured...'
            }
        }))
    }
};

export default Sender;
