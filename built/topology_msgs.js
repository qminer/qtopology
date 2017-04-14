"use strict";
var net = require('net');
var util = require('util');
var os = require('./topology_object_stream');
var Server = (function () {
    function Server(fn) {
        var self = this;
        self._server = net.createServer(function (socket) {
            var stream = os.createStream(socket);
            stream.address = socket.address();
            fn(stream);
        });
    }
    Server.prototype.listen = function (port, domain) {
        this._server.listen(port, domain);
    };
    Server.prototype.close = function () {
        this._server.close();
    };
    return Server;
}());
exports.createServer = function (fn) {
    return new Server(fn);
};
exports.createClient = function (port, host, connect) {
    var socket;
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
    var stream = os.createStream(socket);
    if (connect) {
        socket.on('connect', connect);
    }
    return stream;
};
