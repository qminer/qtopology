"use strict";
const pm = require("../util/pattern_matcher");
const rest = require('node-rest-client');
/////////////////////////////////////////////////////////////////////////////
/** This spout sends GET request to the specified url in regular
 * time intervals and forwards the result.
 * */
class GetSpout {
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._url = null;
        this._stream_id = null;
        this._repeat = null;
        this._run = false;
        this._next_tuple = null;
        this._next_ts = Date.now();
    }
    init(name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._url = config.url;
        this._repeat = config.repeat;
        this._stream_id = config.stream_id;
        this._client = new rest.Client();
        callback();
    }
    heartbeat() {
        if (!this._run) {
            return;
        }
        if (this._next_ts < Date.now()) {
            let self = this;
            let req = self._client.get(self._url, (new_data, response) => {
                this._next_tuple = { body: new_data };
                self._next_ts = Date.now() + self._repeat;
            });
        }
    }
    shutdown(callback) {
        callback();
    }
    run() {
        this._run = true;
    }
    pause() {
        this._run = false;
    }
    next(callback) {
        let data = this._next_tuple;
        this._next_tuple = null;
        callback(null, data, this._stream_id);
    }
}
////////////////////////////////////////////////////////////////////////////////
exports.GetSpout = GetSpout;
