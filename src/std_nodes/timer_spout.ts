import * as intf from "../topology_interfaces";

/** This spout emits single tuple each heartbeat */
export class TimerSpout implements intf.Spout {
    name: string;
    stream_id: string;
    title: string;
    should_run: boolean;
    extra_fields: any;
    next_tuple: any;

    constructor() {
        this.name = null;
        this.stream_id = null;
        this.title = null;
        this.extra_fields = null;

        this.next_tuple = null;
        this.should_run = false;
    }

    init(name: string, config: any, callback: intf.SimpleCallback) {
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
        for (let f in this.extra_fields) {
            if (this.extra_fields.hasOwnProperty(f)) {
                this.next_tuple[f] = this.extra_fields[f];
            }
        }
    }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    run() {
        this.should_run = true;
    }

    pause() {
        this.should_run = false;
    }

    next(callback: intf.SpoutNextCallback) {
        let data = this.next_tuple;
        this.next_tuple = null;
        callback(null, data, this.stream_id);
    }
}
