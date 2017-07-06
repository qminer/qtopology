import * as intf from "../topology_interfaces";
import * as oo from "../util/object_override";

class Record {
    target_value: string;
    data: any;
    callback: intf.SimpleCallback;
}

/** This bolt merges several streams of data
 * so that they are interleaved with respect to specific field value. */
export class DateMergerBolt implements intf.Bolt {

    private name: string;
    private keep_stream_id: boolean;
    private comparison_field: string;
    private initial_delay: number;
    private in_initial_delay: boolean;
    private in_call: boolean;
    private onEmit: intf.BoltEmitCallback;
    private wait_list: Array<Record>;

    constructor() {
        this.name = null;
        this.onEmit = null;
        this.comparison_field = null;
        this.initial_delay = null;
        this.keep_stream_id = null;
        this.wait_list = [];
        this.in_initial_delay = false;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.comparison_field = config.comparison_field;
        this.initial_delay = config.initial_delay || 10 * 1000; // wait for 10 seconds
        this.keep_stream_id = config.keep_stream_id;
        this.in_initial_delay = true;

        let self = this;
        setTimeout(() => { self.executeStep(); }, this.initial_delay);
        callback();
    }

    heartbeat() { }

    shutdown(callback: intf.SimpleCallback) {
        callback();
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        this.wait_list.push({
            data: data,
            target_value: stream_id,
            callback: callback
        });
        if (this.in_initial_delay) {
            return;
        } else {
            this.executeStep();
        }
    }

    executeStep() {
        let self = this;
        if (self.in_call) return;
        if (self.wait_list.length == 0) return;
        // find the oldest data
        self.wait_list = self.wait_list.sort((a, b) => {
            let data_a = a[self.comparison_field];
            let data_b = b[self.comparison_field];
            if (data_a < data_b) return -1;
            if (data_a > data_b) return 1;
            return 0;
        });
        let rec = self.wait_list[0];
        self.wait_list = self.wait_list.slice(1);
        // send the data and catch the retuning calls
        self.in_call = true;
        self.onEmit(rec.data, rec.target_value, (err) => {
            self.in_call = true;
            setTimeout(() => { self.executeStep(); }, 500);
            rec.callback(err);
        });
    }
}
