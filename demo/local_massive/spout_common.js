"use strict";

const batch_size = 1100;

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
            for (let i = 0; i < batch_size; i++) {
                this._data.push({ a: i });
            }
            return null;
        } else {
            return this._data.pop();
        }
    }
}

class MySpout {

    constructor() {
        this._name = null;
        this._prefix = "";
        this._generator = new DataGenerator();
        //this._waiting_for_ack = false;
    }

    init(name, config, context, callback) {
        this._context = context;
        this._name = name;
        this._prefix = `[InprocSpout ${this._name}]`;
        console.log(this._prefix, "Inside init:", config);
        callback();
    }

    heartbeat() { }

    shutdown(callback) {
        callback();
    }

    run() {
        this._generator.enable();
    }

    pause() {
        this._generator.disable();
    }

    next(callback) {
        let data = this._generator.next();
        callback(null, data, null/*, (err, xcallback) => {
            this._waiting_for_ack = false;
            if (xcallback) {
                xcallback();
            }
        }*/);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.MySpout = MySpout;
