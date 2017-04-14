"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
/** This spout receives requests (messages/data) over REST interface.
 * It assumes data is in JSON format.
 */
var RestSpout = (function () {
    function RestSpout() {
        this.name = null;
        this.port = null;
        this.stream_id = null;
        this.should_run = false;
        this.queue = [];
        this.server = null;
    }
    RestSpout.prototype.init = function (name, config, callback) {
        this.name = name;
        this.port = config.port;
        this.stream_id = config.stream_id;
        var self = this;
        this.server = http.createServer(function (req, res) {
            if (self.should_run) {
                var body_1 = [];
                req
                    .on('data', function (chunk) { body_1.push(chunk); })
                    .on('end', function () {
                    var body_s = Buffer.concat(body_1).toString();
                    res.end();
                    self.queue.push(JSON.parse(body_s));
                });
            }
            else {
                res.end();
            }
        });
        self.server.on('clientError', function (err, socket) {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        self.server.listen(self.port, callback);
    };
    RestSpout.prototype.heartbeat = function () { };
    RestSpout.prototype.shutdown = function (callback) {
        this.server.close(callback);
    };
    RestSpout.prototype.run = function () {
        this.should_run = true;
    };
    RestSpout.prototype.pause = function () {
        this.should_run = false;
    };
    RestSpout.prototype.next = function (callback) {
        if (this.queue.length === 0) {
            return callback();
        }
        var data = this.queue[0];
        this.queue = this.queue.slice(1);
        callback(null, data, this.stream_id);
    };
    return RestSpout;
}());
exports.RestSpout = RestSpout;
