"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This bolt base object server as base class for simple tasks
 * that are repeated every X milliseconds. */
class TaskBoltBase {
    constructor() {
        this.onEmit = null;
        this.is_running = false;
        this.next_run = 0;
    }
    init(name, config, context, callback) {
        this.onEmit = config.onEmit;
        this.repeat_after = config.repeat_after || 60000; // each minute
        callback();
    }
    heartbeat() {
        if (this.is_running)
            return;
        if (this.next_run > Date.now())
            return;
        this.is_running = true;
        this.next_run = Date.now() + this.repeat_after;
        let self = this;
        this.runInternal((err) => {
            self.is_running = false;
            if (self.shutdown_cb) {
                let cb = self.shutdown_cb;
                self.shutdown_cb = null;
                cb();
            }
        });
    }
    runInternal(callback) {
        callback();
    }
    shutdown(callback) {
        if (!this.is_running)
            return callback();
        this.shutdown_cb = callback;
    }
    receive(data, stream_id, callback) {
        callback();
    }
}
exports.TaskBoltBase = TaskBoltBase;
//# sourceMappingURL=task_bolt_base.js.map