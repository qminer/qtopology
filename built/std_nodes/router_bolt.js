"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const pm = require("../util/pattern_matcher");
/** This bolt routs incoming messages based on provided
 * queries and sends them forward using mapped stream ids. */
class RouterBolt {
    /** Simple constructor */
    constructor() {
        this.name = null;
        this.onEmit = null;
        this.matchers = [];
    }
    /** Initializes routing patterns */
    init(name, config, context, callback) {
        this.name = name;
        this.onEmit = config.onEmit;
        for (let stream_id in config.routes) {
            if (config.routes.hasOwnProperty(stream_id)) {
                let filter = config.routes[stream_id];
                this.matchers.push({
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
        for (let item of self.matchers) {
            if (item.matcher.isMatch(data)) {
                /* jshint loopfunc:true */
                tasks.push((xcallback) => {
                    self.onEmit(data, item.stream_id, xcallback);
                });
            }
        }
        async.parallel(tasks, callback);
    }
}
exports.RouterBolt = RouterBolt;
//# sourceMappingURL=router_bolt.js.map