"use strict";

const pm = require("../util/pattern_matcher");
const rq = require("request");

/////////////////////////////////////////////////////////////////////////////

/** This bolt sends POST request to specified url (fixed or provided inside data)
 * and forwards the request. */
class PostBolt {

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
        if (this._fixed_url) {
            rq.post(
                { uri: this._fixed_url, json: data },
                (error, response, body) => {
                    if (error) { return callback(error); }
                    self._onEmit({ body: body }, null, callback);
                });
        } else {
            rq.post(
                { uri: data.url, json: data.body },
                (error, response, body) => {
                    if (error) { return callback(error); }
                    self._onEmit({ body: body }, null, callback);
                });
        }
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.PostBolt = PostBolt;
