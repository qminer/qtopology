"use strict";
var pm = require("../util/pattern_matcher");
var rest = require('node-rest-client');
/////////////////////////////////////////////////////////////////////////////
/** This bolt sends GET request to specified url
 * and forwards the result.
 * */
var GetBolt = (function () {
    function GetBolt() {
        this._name = null;
        this._onEmit = null;
        this._fixed_url = null;
    }
    GetBolt.prototype.init = function (name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._fixed_url = config.url;
        this._client = new rest.Client();
        callback();
    };
    GetBolt.prototype.heartbeat = function () { };
    GetBolt.prototype.shutdown = function (callback) {
        callback();
    };
    GetBolt.prototype.receive = function (data, stream_id, callback) {
        var self = this;
        if (self._fixed_url) {
            var req = self._client.get(self._fixed_url, function (new_data, response) {
                self._onEmit({ body: new_data }, null, callback);
            });
            req.on('error', function (err) {
                callback(err);
            });
        }
        else {
            var req = self._client.get(data.url, function (new_data, response) {
                self._onEmit({ body: new_data }, null, callback);
            });
            req.on('error', function (err) {
                callback(err);
            });
        }
    };
    return GetBolt;
}());
////////////////////////////////////////////////////////////////////////////////
exports.GetBolt = GetBolt;
