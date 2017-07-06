"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Record {
}
/** This bolt merges several streams of data
 * so that they are interleaved with respect to specific field value. */
class DateMergerBolt {
    constructor() {
        this.name = null;
        this.onEmit = null;
        this.comparison_field = null;
        this.initial_delay = null;
        this.keep_stream_id = null;
        this.wait_list = [];
        this.in_initial_delay = false;
    }
    init(name, config, context, callback) {
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
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        this.wait_list.push({
            data: data,
            target_value: stream_id,
            callback: callback
        });
        if (this.in_initial_delay) {
            return;
        }
        else {
            this.executeStep();
        }
    }
    executeStep() {
        let self = this;
        if (self.in_call)
            return;
        if (self.wait_list.length == 0)
            return;
        // find the oldest data
        self.wait_list = self.wait_list.sort((a, b) => {
            let data_a = a[self.comparison_field];
            let data_b = b[self.comparison_field];
            if (data_a < data_b)
                return -1;
            if (data_a > data_b)
                return 1;
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
exports.DateMergerBolt = DateMergerBolt;
//# sourceMappingURL=date_merger_bolt.js.map