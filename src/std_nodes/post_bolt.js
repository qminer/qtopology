"use strict";

const pm = require("../util/pattern_matcher");
const rest = require('node-rest-client');

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
        this._client = new rest.Client();
        callback();
    }

    heartbeat() { }

    shutdown(callback) {
        callback();
    }

    receive(data, stream_id, callback) {
        let self = this;
        let url = this._fixed_url;
        let args = {
            data: data,
            headers: { "Content-Type": "application/json" }
        };
        if (!this._fixed_url) {
            url = data.url;
            args.data = data.body;
        }
        let req = self._client.post(url, args, (new_data, response) => {
            self._onEmit({ body: new_data }, null, callback);
        });
        req.on('error', function (err) {
            callback(err);
        });
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.PostBolt = PostBolt;
