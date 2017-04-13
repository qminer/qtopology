"use strict";
const pm = require("../util/pattern_matcher");
const rest = require('node-rest-client');
/////////////////////////////////////////////////////////////////////////////
/** This bolt sends GET request to specified url
 * and forwards the result.
 * */
class GetBolt {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._fixed_url = null;
    }
    init(name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._fixed_url = config.url;
        this._client = new rest.Client();
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        let self = this;
        if (self._fixed_url) {
            let req = self._client.get(self._fixed_url, (new_data, response) => {
                self._onEmit({ body: new_data }, null, callback);
            });
            req.on('error', function (err) {
                callback(err);
            });
        }
        else {
            let req = self._client.get(data.url, (new_data, response) => {
                self._onEmit({ body: new_data }, null, callback);
            });
            req.on('error', function (err) {
                callback(err);
            });
        }
    }
}
////////////////////////////////////////////////////////////////////////////////
exports.GetBolt = GetBolt;
