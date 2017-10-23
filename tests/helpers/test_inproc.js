"use strict";

const async = require("async");

class InprocHelper {

    constructor() {
        this._name = null;
        this._init = null;
        this._onEmit = null;
        this._receive_list = [];
        this._emit_list = [];

        this._init_called = 0;
        this._heartbeat_called = 0;
        this._shutdown_called = 0;
    }

    init(name, init, context, callback) {
        this._init_called++;
        this._name = name;
        this._init = init;
        this._onEmit = init.onEmit;
        this._context = context;
        callback();
    }

    heartbeat() {
        this._heartbeat_called++;
    }

    shutdown() {
        this._shutdown_called++;
    }

    receive(data, stream_id, callback) {
        let self = this;
        self._receive_list.push({ data, stream_id });
        async.eachSeries(
            self._emit_list,
            (item, xcallback) => {
                self._onEmit(item.data, item.stream_id, xcallback);
            },
            callback
        );
    }
    /////////////////////////////////////

    _setupEmit(data, stream_id) {
        this._emit_list.push({ data, stream_id });
    }
}


class InprocHelper2 extends InprocHelper {
    constructor() {
        super();
    }

    receive(data, stream_id, callback) {
        super.receive(data, stream_id, (err) => {
            // confirm after 1.5 sec
            setTimeout(() => {
                callback(err);
            }, 1500);
        });
    }
}

exports.create = function (subtype) {
    if (subtype == "derived") {
        return new InprocHelper2();
    }
    return new InprocHelper();
};
