"use strict";

class MySpout {

    constructor() {
        this._name = null;
        this._data = [];
        this._data_index = 0;
    }

    init(name, config, context, callback) {
        this._name = name;
        // use other fields from config to control your execution

        for (let i = 0; i < 100; i++) {
            this._data.push({ id: i});
        }

        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state
        callback();
    }

    run() {
        // enable this spout - by default it should be disabled
    }

    pause() {
        // disable this spout
    }

    next(callback) {
        // return new tuple or null. Third parameter is stream id.
        if (this._data_index >= this._data.length) {
            callback(null, null, null); // or just callback()
        } else {
            callback(null, this._data[this._data_index++], "xstream");
        }
    }
}

exports.create = function () { return new MySpout(); };