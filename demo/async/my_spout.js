"use strict";

class MyAsyncSpout {

    constructor() {
        this._name = null;
        this._data = [];
        this._data_index = 0;
    }

    async init(name, config, context) {
        this._name = name;

        for (let i = 0; i < 100; i++) {
            this._data.push({ id: i });
        }
    }

    heartbeat() { }
    async shutdown() { }
    run() { }
    pause() { }

    async next() {
        if (this._data_index >= this._data.length) {
            return null;
        } else {
            return {
                data: this._data[this._data_index++],
                stream_id: "stream1"
            };
        }
    }
}

exports.create = function () { return new MyAsyncSpout(); };
