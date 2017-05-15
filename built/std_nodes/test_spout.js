"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This spout emits pre-defined tuples. Mainly used for testing. */
class TestSpout {
    constructor() {
        this.name = null;
        this.stream_id = null;
        this.tuples = null;
        this.should_run = false;
    }
    init(name, config, context, callback) {
        this.name = name;
        this.stream_id = config.stream_id;
        this.tuples = config.tuples || [];
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
        let data = this.tuples[0];
        this.tuples = this.tuples.slice(1);
        callback(null, data, this.stream_id);
    }
}
exports.TestSpout = TestSpout;
//# sourceMappingURL=test_spout.js.map