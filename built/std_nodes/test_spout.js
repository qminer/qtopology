"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This spout emits pre-defined tuples. Mainly used for testing. */
class TestSpout {
    constructor() {
        this.stream_id = null;
        this.tuples = null;
        this.should_run = false;
        this.delay_start = 0;
        this.delay_between = 0;
        this.ts_next_emit = 0;
    }
    init(name, config, context, callback) {
        this.stream_id = config.stream_id;
        this.tuples = config.tuples || [];
        this.delay_between = config.delay_between || 0;
        this.delay_start = config.delay_start || 0;
        if (this.delay_start > 0) {
            this.ts_next_emit = Date.now() + this.delay_start;
        }
        callback();
    }
    heartbeat() { }
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
        if (!this.should_run) {
            return callback(null, null, null);
        }
        if (this.tuples.length === 0) {
            return callback(null, null, null);
        }
        if (this.ts_next_emit > Date.now()) {
            return callback(null, null, null);
        }
        let data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        this.ts_next_emit = Date.now() + this.delay_between;
        callback(null, data, this.stream_id);
    }
}
exports.TestSpout = TestSpout;
//# sourceMappingURL=test_spout.js.map