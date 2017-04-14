"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This spout emits single tuple each heartbeat */
var TimerSpout = (function () {
    function TimerSpout() {
        this.name = null;
        this.stream_id = null;
        this.title = null;
        this.extra_fields = null;
        this.next_tuple = null;
        this.should_run = false;
    }
    TimerSpout.prototype.init = function (name, config, callback) {
        this.name = name;
        this.stream_id = config.stream_id;
        this.title = config.title || "heartbeat";
        this.extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    };
    TimerSpout.prototype.heartbeat = function () {
        this.next_tuple = {
            title: this.title,
            ts: new Date().toISOString()
        };
        for (var f in this.extra_fields) {
            if (this.extra_fields.hasOwnProperty(f)) {
                this.next_tuple[f] = this.extra_fields[f];
            }
        }
    };
    TimerSpout.prototype.shutdown = function (callback) {
        callback();
    };
    TimerSpout.prototype.run = function () {
        this.should_run = true;
    };
    TimerSpout.prototype.pause = function () {
        this.should_run = false;
    };
    TimerSpout.prototype.next = function (callback) {
        var data = this.next_tuple;
        this.next_tuple = null;
        callback(null, data, this.stream_id);
    };
    return TimerSpout;
}());
exports.TimerSpout = TimerSpout;
