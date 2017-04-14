"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var async = require("async");
var pm = require("../util/pattern_matcher");
/** This bolt routs incoming messages based on provided
 * queries and sends them forward using mapped stream ids. */
var RouterBolt = (function () {
    /** Simple constructor */
    function RouterBolt() {
        this.name = null;
        this.onEmit = null;
        this.matchers = [];
    }
    /** Initializes routing patterns */
    RouterBolt.prototype.init = function (name, config, callback) {
        this.name = name;
        this.onEmit = config.onEmit;
        for (var stream_id in config.routes) {
            if (config.routes.hasOwnProperty(stream_id)) {
                var filter = config.routes[stream_id];
                this.matchers.push({
                    stream_id: stream_id,
                    matcher: new pm.PaternMatcher(filter)
                });
            }
        }
        callback();
    };
    RouterBolt.prototype.heartbeat = function () { };
    RouterBolt.prototype.shutdown = function (callback) {
        callback();
    };
    RouterBolt.prototype.receive = function (data, stream_id, callback) {
        var self = this;
        var tasks = [];
        var _loop_1 = function (item) {
            if (item.matcher.isMatch(data)) {
                /* jshint loopfunc:true */
                tasks.push(function (xcallback) {
                    self.onEmit(data, item.stream_id, xcallback);
                });
            }
        };
        for (var _i = 0, _a = self.matchers; _i < _a.length; _i++) {
            var item = _a[_i];
            _loop_1(item);
        }
        async.parallel(tasks, callback);
    };
    return RouterBolt;
}());
exports.RouterBolt = RouterBolt;
