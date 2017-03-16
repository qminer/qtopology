"use strict";

/** This bolt attaches fixed fields to incoming messages
 * and sends them forward. */
class AttacherBolt {

    constructor() {
        this._name = null;
        this._onEmit = null;
        this._matcher = null;
        this._extra_fields = null;
    }

    init(name, config, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        this._extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    }

    heartbeat() { }

    shutdown(callback) {
        callback();
    }

    receive(data, stream_id, callback) {
        for (let f in this._extra_fields) {
            if (this._extra_fields.hasOwnProperty(f)) {
                data[f] = this._extra_fields[f];
            }
        }
        this._onEmit(data, stream_id, callback);
    }
}

////////////////////////////////////////////////////////////////////////////////

exports.AttacherBolt = AttacherBolt;
