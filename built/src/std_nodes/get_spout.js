"use strict";
var pm = require("../util/pattern_matcher");
var rest = require('node-rest-client');
/////////////////////////////////////////////////////////////////////////////
/** This spout sends GET request to the specified url in regular
 * time intervals and forwards the result.
 * */
var GetSpout = (function () {
    function GetSpout() {
        this._name = null;
        this._onEmit = null;
        this._url = null;
        this._stream_id = null;
        this._repeat = null;
        this._run = false;
        this._next_tuple = null;
        this._next_ts = Date.now();
    }
    GetSpout.prototype.init = function (name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._url = config.url;
        this._repeat = config.repeat;
        this._stream_id = config.stream_id;
        this._client = new rest.Client();
        callback();
    };
    GetSpout.prototype.heartbeat = function () {
        var _this = this;
        if (!this._run) {
            return;
        }
        if (this._next_ts < Date.now()) {
            var self_1 = this;
            var req = self_1._client.get(self_1._url, function (new_data, response) {
                _this._next_tuple = { body: new_data };
                self_1._next_ts = Date.now() + self_1._repeat;
            });
        }
    };
    GetSpout.prototype.shutdown = function (callback) {
        callback();
    };
    GetSpout.prototype.run = function () {
        this._run = true;
    };
    GetSpout.prototype.pause = function () {
        this._run = false;
    };
    GetSpout.prototype.next = function (callback) {
        var data = this._next_tuple;
        this._next_tuple = null;
        callback(null, data, this._stream_id);
    };
    return GetSpout;
}());
////////////////////////////////////////////////////////////////////////////////
exports.GetSpout = GetSpout;
