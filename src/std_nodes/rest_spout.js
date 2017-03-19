"use strict";

const pm = require("../util/pattern_matcher");
const http = require('http');

/////////////////////////////////////////////////////////////////////////////

/** This spout receives requests (messages/data) over REST interface.
 * It assumes data is in JSON format.
 */
class RestSpout {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._port = null;
        this._stream_id = null;
        this._run = false;
        this._queue = [];
        this._server = null;
    }

    init(name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._port = config.port;
        this._stream_id = config.stream_id;

        let self = this;
        this._server = http.createServer((req, res) => {
            if (self._run) {
                let body = [];
                req
                    .on('data', (chunk) => { body.push(chunk); })
                    .on('end', () => {
                        body = Buffer.concat(body).toString();
                        res.end();
                        this._queue.push(JSON.parse(body));
                    });
            } else {
                res.end();
            }
        });
        this._server.on('clientError', (err, socket) => {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        this._server.listen(this._port, callback);
    }

    heartbeat() { }

    shutdown(callback) {
        this._server.close(callback);
    }

    run() {
        this._run = true;
    }

    pause() {
        this._run = false;
    }

    next(callback) {
        if (this._queue.length == 0) {
            return callback();
        }
        let data = this._queue[0];
        this._queue = this._queue.slice(1);
        callback(null, data, this._stream_id);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.RestSpout = RestSpout;
