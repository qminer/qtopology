"use strict";

/** This spout emits single tuple each heartbeat */
class TimerSpout {

    constructor() {
        this._name = null;
        this._stream_id = null;
        this._title = null;
        this._extra_fields = null;

        this._next_tuple = null;
        this._run = false;
    }

    init(name, config, callback) {
        this._name = name;
        this._stream_id = config.stream_id;
        this._title = config.title || "heartbeat";
        this._extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    }

    heartbeat() {
        this._next_tuple = {
            title: this._title,
            ts: new Date().toISOString()
        };
        for (let f in this._extra_fields) {
            if (this._extra_fields.hasOwnProperty(f)) {
                this._next_tuple[f] = this._extra_fields[f];
            }
        }
    }

    shutdown(callback) {
        callback();
    }

    run() {
        this._run = true;
    }

    pause() {
        this._run = false;
    }

    next(callback) {
        let data = this._next_tuple;
        this._next_tuple = null;
        callback(null, data, this._stream_id);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.TimerSpout = TimerSpout;
