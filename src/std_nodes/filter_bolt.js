"use strict";

const pm = require("../util/pattern_matcher");

/////////////////////////////////////////////////////////////////////////////

/** This bolt just writes all incoming data to console. */
class FilterBolt {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._matcher = null;
    }

    init(name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._matcher = new pm.PaternMatcher(config.filter);
        callback();
    }

    heartbeat() { }

    shutdown(callback) {
        callback();
    }

    run() { }

    pause() { }

    receive(data, stream_id, callback) {
        if (this._matcher.isMatch(data)) {
            this._onEmit(data, stream_id, callback);
        } else {
            callback();
        }
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.FilterBolt = FilterBolt;
