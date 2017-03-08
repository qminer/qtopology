"use strict";

/////////////////////////////////////////////////////////////////////////////

class MyBolt {

    constructor() {
        this._name = null;
        this._prefix = "";
        this._sum = 0;
        this._forward = true;
        this._onEmit = null;
    }

    init(name, config, callback) {
        this._name = name;
        this._prefix = `[InprocBolt ${this._name}]`;
        console.log(this._prefix, "Inside init:", config);
        this._onEmit = config.onEmit;
        this._forward = config.forward;
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
        console.log(this._prefix, "Inside receive", data);
        this._sum += data.a;
        if (this._forward) {
            data.sum = this._sum;
            console.log("##", "Emiting", data);
            this._onEmit(data); // emit same data, with addition of sum
        }
        callback(null);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.MyBolt = MyBolt;
