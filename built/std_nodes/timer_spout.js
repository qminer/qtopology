"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const oo = require("../util/object_override");
/** This spout emits single tuple each heartbeat */
class TimerSpout {
    constructor() {
        this.name = null;
        this.stream_id = null;
        this.title = null;
        this.extra_fields = null;
        this.next_tuple = null;
        this.should_run = false;
    }
    init(name, config, context, callback) {
        this.name = name;
        this.stream_id = config.stream_id;
        this.title = config.title || "heartbeat";
        this.extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    }
    heartbeat() {
        this.next_tuple = {
            title: this.title,
            ts: new Date().toISOString()
        };
        oo.overrideObject(this.next_tuple, this.extra_fields, false);
    }
    shutdown(callback) {
        callback();
    }
    run() {
        this.should_run = true;
    }
    pause() {
        this.should_run = false;
    }
    next(callback) {
        let data = this.next_tuple;
        this.next_tuple = null;
        callback(null, data, this.stream_id);
    }
}
exports.TimerSpout = TimerSpout;
//# sourceMappingURL=timer_spout.js.map