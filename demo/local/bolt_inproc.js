"use strict";

class MyBolt {

    constructor() {
        this._name = null;
        this._context = null;
        this._prefix = "";
        this._sum = 0;
        this._forward = true;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._context = context;
        this._name = name;
        this._prefix = `[InprocBolt ${this._name}]`;
        console.log(this._prefix, "Inside init:", config);
        this._onEmit = config.onEmit;
        this._forward = config.forward;
        callback();
    }

    heartbeat() {
        console.log(this._prefix, "Inside heartbeat. sum=" + this._sum, "Context", this._context);
        //this._onEmit({ sum: this._sum }, () => { });
    }

    shutdown(callback) {
        console.log(this._prefix, "Shutting down gracefully. sum=" + this._sum);
        callback();
    }

    receive(data, stream_id, callback) {
        let self = this;
        if (self._context) {
            self._context.cnt++;
        }
        console.log(this._prefix, "Inside receive", data, "$" + stream_id + "$");
        this._sum += data.a;
        setTimeout(function () {
            if (self._forward) {
                data.sum = self._sum;
                let xstream_id = (data.sum % 2 === 0 ? "Even" : "Odd");
                self._onEmit(data, xstream_id, callback); // emit same data, with addition of sum
            } else {
                callback();
            }
        }, Math.round(80 * Math.random()));
    }
}

exports.create = function () {
    return new MyBolt();
};
