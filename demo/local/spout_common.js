"use strict";

class DataGenerator {
    constructor() {
        this._enabled = false;
        this._data = [];
    }
    enable() {
        this._enabled = true;
    }
    disable() {
        this._enabled = false;
    }
    next() {
        if (!this._enabled) {
            return false;
        }
        if (this._data.length === 0) {
            this._data = [];
            for (let i = 0; i < 15; i++) {
                this._data.push({ a: i });
            }
            return null;
        } else {
            return this._data.pop();
        }
    }
}

class MySpout {

    constructor(context) {
        this._name = null;
        this._context = context;
        this._prefix = "";
        this._generator = new DataGenerator();
        this._waiting_for_ack = false;
    }

    init(name, config, callback) {
        this._name = name;
        this._prefix = `[InprocSpout ${this._name}]`;
        console.log(this._prefix, "Inside init:", config);
        callback();
    }

    heartbeat() {
        console.log(this._prefix, "Inside heartbeat. context=", this._context);
    }

    shutdown(callback) {
        console.log(this._prefix, "Shutting down gracefully.");
        callback();
    }

    run() {
        console.log(this._prefix, "Inside run");
        this._generator.enable();
    }

    pause() {
        console.log(this._prefix, "Inside pause");
        this._generator.disable();
    }

    next(callback) {
        console.log(this._prefix, "Inside next");
        if (this._waiting_for_ack) {
            return callback(null, null, null); // no data
        }
        let data = this._generator.next();
        this._waiting_for_ack = (data !== null);
        callback(null, data, null, (err, xcallback) => {
            this._waiting_for_ack = false;
            if (xcallback) {
                xcallback();
            }
        });
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.MySpout = MySpout;
