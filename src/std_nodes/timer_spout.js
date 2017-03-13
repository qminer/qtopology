"use strict";

/** This spout emits single tuple each heartbeat */
class HeartbeatSpout {

    constructor() {
        this._name = null;
        this._stream_id = null;
        this._next_tuple = null;
        this._run = false;
    }

    init(name, config, callback) {
        this._name = name;
        this._stream_id = config.stream_id;
        callback();
    }

    heartbeat() {
        this._next_tuple = { title: "heartbeat", ts: new Date().toISOString() };
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

exports.HeartbeatSpout = HeartbeatSpout;
