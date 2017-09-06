export class Sender {

    socket = {}

    constructor (socket) {
        this.socket = socket;
    }

    send (query, data) {
        this.socket.send(JSON.stringify({
            status: 1,
            query,
            data
        }))
    }

    error (code, message) {
        this.socket.send(JSON.stringify({
            status: 0,
            error: {
                code,
                message: message || "an error occured..."
            }
        }))
    }
};

export default Sender;
