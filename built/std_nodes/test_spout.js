"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This spout emits pre-defined tuples. Mainly used for testing. */
var TestSpout = (function () {
    function TestSpout() {
        this.name = null;
        this.stream_id = null;
        this.tuples = null;
        this.should_run = false;
    }
    TestSpout.prototype.init = function (name, config, callback) {
        this.name = name;
        this.stream_id = config.stream_id;
        this.tuples = config.tuples || [];
        callback();
    };
    TestSpout.prototype.heartbeat = function () { };
    TestSpout.prototype.shutdown = function (callback) {
        callback();
    };
    TestSpout.prototype.run = function () {
        this.should_run = true;
    };
    TestSpout.prototype.pause = function () {
        this.should_run = false;
    };
    TestSpout.prototype.next = function (callback) {
        if (!this.should_run) {
            return callback(null, null, null);
        }
        if (this.tuples.length === 0) {
            return callback(null, null, null);
        }
        var data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        callback(null, data, this.stream_id);
    };
    return TestSpout;
}());
exports.TestSpout = TestSpout;
