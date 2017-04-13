"use strict";
var pm = require("../util/pattern_matcher");
var rest = require('node-rest-client');
/////////////////////////////////////////////////////////////////////////////
/** This bolt sends POST request to specified url (fixed or provided inside data)
 * and forwards the request. */
var PostBolt = (function () {
    function PostBolt() {
        this._name = null;
        this._onEmit = null;
        this._fixed_url = null;
    }
    PostBolt.prototype.init = function (name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._fixed_url = config.url;
        this._client = new rest.Client();
        callback();
    };
    PostBolt.prototype.heartbeat = function () { };
    PostBolt.prototype.shutdown = function (callback) {
        callback();
    };
    PostBolt.prototype.receive = function (data, stream_id, callback) {
        var self = this;
        var url = this._fixed_url;
        var args = {
            data: data,
            headers: { "Content-Type": "application/json" }
        };
        if (!this._fixed_url) {
            url = data.url;
            args.data = data.body;
        }
        var req = self._client.post(url, args, function (new_data, response) {
            self._onEmit({ body: new_data }, null, callback);
        });
        req.on('error', function (err) {
            callback(err);
        });
    };
    return PostBolt;
}());
////////////////////////////////////////////////////////////////////////////////
exports.PostBolt = PostBolt;
