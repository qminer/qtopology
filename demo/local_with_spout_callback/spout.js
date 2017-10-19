"use strict";

const async = require("async");


/** This class simulates spout that loads records from
 * DB in batches, with some simulated latency.
 * It then ACKs them by providing ack-callback.
 */

class SpoutWithCallback {

    constructor() {
        this._name = null;
        this._data_source = null;
        this._stream_id = null;
        this._batch_size = null;
        this._delay = null;
        this._counter = 0;
        this._pending_data = [];
        this._pending_acks = [];
        this._prefix = "";
    }

    init(name, config, context, callback) {
        this._name = name;
        this._context = context;
        this._stream_id = config.stream_id;
        this._batch_size = config.batch_size || 50;
        this._delay = config.delay || 0;
        this._prefix = `[SpoutWithCallback] ` + Math.random().toString(36) + " ";
        callback();
    }

    heartbeat() { }

    shutdown(callback) {
        console.log(this._prefix + "Sending acks...");
        // we just ACK those records that have been processed
        // others will stay in DB and will be retrieved later
        this._sendAcks(callback);
    }

    run() { }

    pause() { }

    next(callback) {
        let self = this;
        async.series(
            [
                (xcallback) => {
                    if (self._pending_data.length > 0) {
                        xcallback();
                    } else {
                        self._loadFromDb(xcallback);
                    }
                }
            ],
            (err) => {
                if (err) { return callback(err); }
                if (self._pending_data.length == 0) {
                    self._sendAcks(callback);
                } else {
                    let data_to_send = self._pending_data[0];
                    self._pending_data = self._pending_data.slice(1);
                    let data_to_send_id = data_to_send.id;
                    data_to_send.id = undefined;
                    callback(null, data_to_send, self._stream_id, (err, ycallback) => {
                        self._pending_acks.push(data_to_send_id);
                        if (ycallback) {
                            ycallback();
                        }
                    });
                }
            }
        );
    }

    _loadFromDb(callback) {
        let self = this;
        async.series(
            [
                (xcallback) => {
                    self._sendAcks(xcallback);
                },
                (xcallback) => {
                    console.log(self._prefix + "Loading new recs");

                    // simulate DB call
                    setTimeout(() => {
                        // Most of the time, generate new data.
                        // Only occasionally return an empty data.
                        let data = [];
                        if (Math.random() > 0.05) {
                            for (let i = 0; i < self._batch_size; i++) {
                                data.push({ id: self._counter++, val: Math.sin(this._counter) });
                            }
                        }

                        console.log(self._prefix + "Loaded new recs: " + data.length);
                        self._pending_data = data;
                        xcallback();
                    }, 1000 * Math.random());
                },
            ],
            callback
        );
    }

    _sendAcks(callback) {
        if (this._pending_acks.length == 0) {
            return callback();
        }
        let ids = this._pending_acks;
        // Simulate call to DB that ACKs previously retrieved data
        console.log(this._prefix + "Sending acks: " + ids.length);
        this._pending_acks = [];
        setTimeout(() => {
            callback();
        }, 1000 * Math.random());
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.create = function () { return new SpoutWithCallback(); };
