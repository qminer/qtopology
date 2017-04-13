"use strict";
var pm = require("../util/pattern_matcher");
var http = require('http');
/////////////////////////////////////////////////////////////////////////////
/** This spout receives requests (messages/data) over REST interface.
 * It assumes data is in JSON format.
 */
var RestSpout = (function () {
    function RestSpout() {
        this._name = null;
        this._onEmit = null;
        this._port = null;
        this._stream_id = null;
        this._run = false;
        this._queue = [];
        this._server = null;
    }
    RestSpout.prototype.init = function (name, config, callback) {
        var _this = this;
        this._name = name;
        this._onEmit = config.onEmit;
        this._port = config.port;
        this._stream_id = config.stream_id;
        var self = this;
        this._server = http.createServer(function (req, res) {
            if (self._run) {
                var body_1 = [];
                req
                    .on('data', function (chunk) { body_1.push(chunk); })
                    .on('end', function () {
                    body_1 = Buffer.concat(body_1).toString();
                    res.end();
                    _this._queue.push(JSON.parse(body_1));
                });
            }
            else {
                res.end();
            }
        });
        this._server.on('clientError', function (err, socket) {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        this._server.listen(this._port, callback);
    };
    RestSpout.prototype.heartbeat = function () { };
    RestSpout.prototype.shutdown = function (callback) {
        this._server.close(callback);
    };
    RestSpout.prototype.run = function () {
        this._run = true;
    };
    RestSpout.prototype.pause = function () {
        this._run = false;
    };
    RestSpout.prototype.next = function (callback) {
        if (this._queue.length === 0) {
            return callback();
        }
        var data = this._queue[0];
        this._queue = this._queue.slice(1);
        callback(null, data, this._stream_id);
    };
    return RestSpout;
}());
////////////////////////////////////////////////////////////////////////////////
exports.RestSpout = RestSpout;
