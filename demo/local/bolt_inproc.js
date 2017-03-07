"use strict";

/////////////////////////////////////////////////////////////////////////////

class MyBolt {

    constructor() {
        this._name = null;
        this._prefix = "";
        this._sum = 0;
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
        console.log(this._prefix, "Inside heartbeat. sum=" + this._sum);
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

    send(data, callback) {
        console.log(this._prefix, "Inside send");
        this._sum += data.a;
        this._onEmit(data);
        callback(null);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.create = function () { return new MyBolt(); };
