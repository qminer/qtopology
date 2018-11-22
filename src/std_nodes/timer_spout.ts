import * as intf from "../topology_interfaces";
import * as oo from "../util/object_override";

/** This spout emits single tuple each heartbeat */
export class TimerSpout implements intf.Spout {

    private stream_id: string;
    private title: string;
    private should_run: boolean;
    private extra_fields: any;
    private next_tuple: any;

    constructor() {
        this.stream_id = null;
        this.title = null;
        this.extra_fields = null;

        this.next_tuple = null;
        this.should_run = false;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.stream_id = config.stream_id;
        this.title = config.title || "heartbeat";
        this.extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    }

    heartbeat() {
        if (!this.should_run) { return; }
        this.next_tuple = {
            title: this.title,
            ts: new Date().toISOString()
        };
        oo.overrideObject(this.next_tuple, this.extra_fields, false);
    }

    shutdown(callback: intf.SimpleCallback) {
        this.should_run = false;
        callback();
    }

    run() {
        this.should_run = true;
    }

    pause() {
        this.should_run = false;
    }

    next(callback: intf.SpoutNextCallback) {
        if (!this.should_run) {
            return callback(null, null, null);
        }
        let data = this.next_tuple;
        this.next_tuple = null;
        callback(null, data, this.stream_id);
    }
}
