"use strict";
const net = require('net');
const util = require('util');
const os = require('./topology_object_stream');
class Server {
    constructor(fn) {
        let self = this;
        self._server = net.createServer((socket) => {
            let stream = os.createStream(socket);
            stream.address = socket.address();
            fn(stream);
        });
    }
    listen(port, domain) {
        this._server.listen(port, domain);
    }
    close() {
        this._server.close();
    }
}
exports.createServer = function (fn) {
    return new Server(fn);
};
exports.createClient = function (port, host, connect) {
    let socket;
    if (typeof port === 'object') {
        socket = port;
        port = undefined;
    }
    if (typeof host === 'function') {
        connect = host;
        host = undefined;
    }
    if (!socket) {
        socket = net.connect(port, host);
    }
    let stream = os.createStream(socket);
    if (connect) {
        socket.on('connect', connect);
    }
    return stream;
};
