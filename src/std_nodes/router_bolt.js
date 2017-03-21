"use strict";

const async = require("async");
const pm = require("../util/pattern_matcher");

/////////////////////////////////////////////////////////////////////////////

/** This bolt routs incoming messages based on provided
 * queries and sends them forward using mapped stream ids. */
class RouterBolt {

    /** Simple constructor */
    constructor() {
        this._name = null;
        this._onEmit = null;
        this._matchers = [];
    }

    /** Initializes routing patterns */
    init(name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        for (let stream_id in config.routes) {
            if (config.routes.hasOwnProperty(stream_id)) {
                let filter = config.routes[stream_id];
                this._matchers.push({
                    stream_id: stream_id,
                    matcher: new pm.PaternMatcher(filter)
                });
            }
        }
        callback();
    }

    heartbeat() { }

    shutdown(callback) {
        callback();
    }

    receive(data, stream_id, callback) {
        let self = this;
        let tasks = [];
        for (let item of self._matchers) {
            if (item.matcher.isMatch(data)) {
                tasks.push((xcallback) => {
                    self._onEmit(data, item.stream_id, xcallback);
                });
            }
        }
        async.parallel(tasks, callback);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.RouterBolt = RouterBolt;
