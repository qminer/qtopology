"use strict";

/////////////////////////////////////////////////////////////////////////////

/** This bolt just writes all incoming data to console. */
class ConsoleBolt {

    constructor() {
        this._name = null;
        this._prefix = "";
        this._onEmit = null;
    }

    init(name, config, callback) {
        this._name = name;
        this._prefix = `[InprocBolt ${this._name}]`;
        console.log(this._prefix, "Inside init:", config);
        this._onEmit = config.onEmit;
        callback();
    }

    heartbeat() {
        console.log(this._prefix, "Inside heartbeat.");
    }

    shutdown(callback) {
        console.log(this._prefix, "Shutting down gracefully.");
        callback();
    }

    run() {
        console.log(this._prefix, "Inside run");
    }

    pause() {
        console.log(this._prefix, "Inside pause");
    }

    receive(data, stream_id, callback) {
        console.log(this._prefix, "Inside receive", data, "$" + stream_id + "$");
        this._onEmit(data, stream_id, callback);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.ConsoleBolt = ConsoleBolt;
