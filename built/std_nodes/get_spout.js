"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rest = require("node-rest-client");
/** This spout sends GET request to the specified url in regular
 * time intervals and forwards the result.
 * */
var GetSpout = (function () {
    function GetSpout() {
        this.name = null;
        this.url = null;
        this.stream_id = null;
        this.repeat = null;
        this.should_run = false;
        this.next_tuple = null;
        this.next_ts = Date.now();
    }
    GetSpout.prototype.init = function (name, config, callback) {
        this.name = name;
        this.url = config.url;
        this.repeat = config.repeat;
        this.stream_id = config.stream_id;
        this.client = new rest.Client();
        callback();
    };
    GetSpout.prototype.heartbeat = function () {
        var _this = this;
        if (!this.should_run) {
            return;
        }
        if (this.next_ts < Date.now()) {
            var self_1 = this;
            var req = self_1.client.get(self_1.url, function (new_data, response) {
                _this.next_tuple = { body: new_data };
                self_1.next_ts = Date.now() + self_1.repeat;
            });
        }
    };
    GetSpout.prototype.shutdown = function (callback) {
        callback();
    };
    GetSpout.prototype.run = function () {
        this.should_run = true;
    };
    GetSpout.prototype.pause = function () {
        this.should_run = false;
    };
    GetSpout.prototype.next = function (callback) {
        var data = this.next_tuple;
        this.next_tuple = null;
        callback(null, data, this.stream_id);
    };
    return GetSpout;
}());
exports.GetSpout = GetSpout;
