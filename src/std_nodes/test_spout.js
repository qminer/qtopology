"use strict";

/** This spout emits pre-defined tuples. Mainly used for testing. */
class TestSpout {

    constructor() {
        this._name = null;
        this._stream_id = null;
        this._tuples = null;
        this._run = false;
    }

    init(name, config, callback) {
        this._name = name;
        this._stream_id = config.stream_id;
        this._tuples = config.tuples || [];
        callback();
    }

    heartbeat() { }

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
        if (!this._run) { return callback(); }
        if (this._tuples.length === 0) { return callback(); }
        let data = this._tuples[0];
        this._tuples = this._tuples.slice(1);
        callback(null, data, this._stream_id);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.TestSpout = TestSpout;
