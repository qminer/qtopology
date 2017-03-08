"use strict";

/////////////////////////////////////////////////////////////////////////////

class QMinerBolt {

    constructor() {
        this._name = null;
        this._prefix = "";
        this._sum = 0;
        this._onEmit = null;
    }

    init(name, config, callback) {
        this._name = name;
        this._prefix = `[QmBolt ${this._name}]`;
        console.log(this._prefix, "Inside init:", config);
        this._onEmit = config.onEmit;
        callback();
    }

    heartbeat() {
        console.log(this._prefix, "Inside heartbeat. sum=" + this._sum);
        this._onEmit({ sum: this._sum });
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

    receive(data, callback) {
        //console.log(this._prefix, "Inside receive", data);
        this._sum += data.a;
        callback(null);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.QMinerBolt = QMinerBolt;
