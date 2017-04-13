"use strict";
var pm = require("../util/pattern_matcher");
/////////////////////////////////////////////////////////////////////////////
/** This bolt filters incoming messages based on provided
 * filter and sends them forward. */
var FilterBolt = (function () {
    function FilterBolt() {
        this._name = null;
        this._onEmit = null;
        this._matcher = null;
    }
    /** Initializes filtering pattern */
    FilterBolt.prototype.init = function (name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._matcher = new pm.PaternMatcher(config.filter);
        callback();
    };
    FilterBolt.prototype.heartbeat = function () { };
    FilterBolt.prototype.shutdown = function (callback) {
        callback();
    };
    FilterBolt.prototype.receive = function (data, stream_id, callback) {
        if (this._matcher.isMatch(data)) {
            this._onEmit(data, stream_id, callback);
        }
        else {
            callback();
        }
    };
    return FilterBolt;
}());
////////////////////////////////////////////////////////////////////////////////
exports.FilterBolt = FilterBolt;
