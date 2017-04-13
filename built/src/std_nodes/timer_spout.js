"use strict";
/** This spout emits single tuple each heartbeat */
var TimerSpout = (function () {
    function TimerSpout() {
        this._name = null;
        this._stream_id = null;
        this._title = null;
        this._extra_fields = null;
        this._next_tuple = null;
        this._run = false;
    }
    TimerSpout.prototype.init = function (name, config, callback) {
        this._name = name;
        this._stream_id = config.stream_id;
        this._title = config.title || "heartbeat";
        this._extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    };
    TimerSpout.prototype.heartbeat = function () {
        this._next_tuple = {
            title: this._title,
            ts: new Date().toISOString()
        };
        for (var f in this._extra_fields) {
            if (this._extra_fields.hasOwnProperty(f)) {
                this._next_tuple[f] = this._extra_fields[f];
            }
        }
    };
    TimerSpout.prototype.shutdown = function (callback) {
        callback();
    };
    TimerSpout.prototype.run = function () {
        this._run = true;
    };
    TimerSpout.prototype.pause = function () {
        this._run = false;
    };
    TimerSpout.prototype.next = function (callback) {
        var data = this._next_tuple;
        this._next_tuple = null;
        callback(null, data, this._stream_id);
    };
    return TimerSpout;
}());
////////////////////////////////////////////////////////////////////////////////
exports.TimerSpout = TimerSpout;
