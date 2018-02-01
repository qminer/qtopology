import * as intf from "../topology_interfaces";

/** This bolt base object server as base class for simple tasks
 * that are repeated every X milliseconds. */
export class TaskBoltBase implements intf.Bolt {

    protected onEmit: intf.BoltEmitCallback;
    private is_running: boolean;
    private next_run: number;
    private repeat_after: number;
    private shutdown_cb: intf.SimpleCallback;

    constructor() {
        this.onEmit = null;
        this.is_running = false;
        this.next_run = 0;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.onEmit = config.onEmit;
        this.repeat_after = config.repeat_after || 60000; // each minute
        callback();
    }

    heartbeat() {
        if (this.is_running) return;
        if (this.next_run > Date.now()) return;

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

    protected runInternal(callback: intf.SimpleCallback) {
        callback();
    }

    shutdown(callback: intf.SimpleCallback) {
        if (!this.is_running) return callback();
        this.shutdown_cb = callback;
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        callback();
    }
}
