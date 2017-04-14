"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rest = require("node-rest-client");
/** This bolt sends GET request to specified url
 * and forwards the result.
 * */
var GetBolt = (function () {
    function GetBolt() {
        this.name = null;
        this.onEmit = null;
        this.fixed_url = null;
    }
    GetBolt.prototype.init = function (name, config, callback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.fixed_url = config.url;
        this.client = new rest.Client();
        callback();
    };
    GetBolt.prototype.heartbeat = function () { };
    GetBolt.prototype.shutdown = function (callback) {
        callback();
    };
    GetBolt.prototype.receive = function (data, stream_id, callback) {
        var self = this;
        if (self.fixed_url) {
            var req = self.client.get(self.fixed_url, function (new_data, response) {
                self.onEmit({ body: new_data }, null, callback);
            });
            req.on('error', function (err) {
                callback(err);
            });
        }
        else {
            var req = self.client.get(data.url, function (new_data, response) {
                self.onEmit({ body: new_data }, null, callback);
            });
            req.on('error', function (err) {
                callback(err);
            });
        }
    };
    return GetBolt;
}());
exports.GetBolt = GetBolt;
////////////////////////////////////////////////////////////////////////////////
exports.GetBolt = GetBolt;
