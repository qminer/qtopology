"use strict";
/** This spout emits pre-defined tuples. Mainly used for testing. */
var TestSpout = (function () {
    function TestSpout() {
        this._name = null;
        this._stream_id = null;
        this._tuples = null;
        this._run = false;
    }
    TestSpout.prototype.init = function (name, config, callback) {
        this._name = name;
        this._stream_id = config.stream_id;
        this._tuples = config.tuples || [];
        callback();
    };
    TestSpout.prototype.heartbeat = function () { };
    TestSpout.prototype.shutdown = function (callback) {
        callback();
    };
    TestSpout.prototype.run = function () {
        this._run = true;
    };
    TestSpout.prototype.pause = function () {
        this._run = false;
    };
    TestSpout.prototype.next = function (callback) {
        if (!this._run) {
            return callback();
        }
        if (this._tuples.length === 0) {
            return callback();
        }
        var data = this._tuples[0];
        this._tuples = this._tuples.slice(1);
        callback(null, data, this._stream_id);
    };
    return TestSpout;
}());
////////////////////////////////////////////////////////////////////////////////
exports.TestSpout = TestSpout;
