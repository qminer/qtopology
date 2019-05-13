"use strict";

class MyAsyncBolt {

    constructor() {
        this._name = null;
        this._onEmit = null;
    }

    async init(name, config, context) {
        this._name = name;
        this._onEmit = config.onEmit;
    }

    heartbeat() { }
    async shutdown() { }

    async receive(data, stream_id) {
        console.log(data, stream_id);
    }
}

exports.create = function () { return new MyAsyncBolt(); };
