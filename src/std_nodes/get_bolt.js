"use strict";

const pm = require("../util/pattern_matcher");
const rq = require("request");

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
        callback();
    }

    heartbeat() { }

    shutdown(callback) {
        callback();
    }

    receive(data, stream_id, callback) {
        let self = this;
        if (self._fixed_url) {
            rq.get(
                self._fixed_url,
                (error, response, body) => {
                    if (error) { return callback(error); }
                    self._onEmit({ body: body }, null, callback);
                });
        } else {
            rq.post(
                data.url,
                (error, response, body) => {
                    if (error) { return callback(error); }
                    self._onEmit({ body: body }, null, callback);
                });
        }
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.GetBolt = GetBolt;
