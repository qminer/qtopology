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
        this._onEmit = config.onEmit;
        callback();
    }

    heartbeat() { }

    shutdown(callback) {
        callback();
    }

    receive(data, stream_id, callback) {
        console.log(this._prefix, "Inside receive", data, "$" + stream_id + "$");
        this._onEmit(data, stream_id, callback);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.ConsoleBolt = ConsoleBolt;
