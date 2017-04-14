"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pm = require("../util/pattern_matcher");
/////////////////////////////////////////////////////////////////////////////
/** This bolt filters incoming messages based on provided
 * filter and sends them forward. */
var FilterBolt = (function () {
    function FilterBolt() {
        this.name = null;
        this.onEmit = null;
        this.matcher = null;
    }
    /** Initializes filtering pattern */
    FilterBolt.prototype.init = function (name, config, callback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.matcher = new pm.PaternMatcher(config.filter);
        callback();
    };
    FilterBolt.prototype.heartbeat = function () { };
    FilterBolt.prototype.shutdown = function (callback) {
        callback();
    };
    FilterBolt.prototype.receive = function (data, stream_id, callback) {
        if (this.matcher.isMatch(data)) {
            this.onEmit(data, stream_id, callback);
        }
        else {
            callback();
        }
    };
    return FilterBolt;
}());
exports.FilterBolt = FilterBolt;
