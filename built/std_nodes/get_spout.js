"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rest = require("node-rest-client");
/** This spout sends GET request to the specified url in regular
 * time intervals and forwards the result.
 * */
class GetSpout {
    constructor() {
        this.name = null;
        this.url = null;
        this.stream_id = null;
        this.repeat = null;
        this.should_run = false;
        this.next_tuple = null;
        this.next_ts = Date.now();
    }
    init(name, config, callback) {
        this.name = name;
        this.url = config.url;
        this.repeat = config.repeat;
        this.stream_id = config.stream_id;
        this.client = new rest.Client();
        callback();
    }
    heartbeat() {
        if (!this.should_run) {
            return;
        }
        if (this.next_ts < Date.now()) {
            let self = this;
            let req = self.client.get(self.url, (new_data, response) => {
                this.next_tuple = { body: new_data };
                self.next_ts = Date.now() + self.repeat;
            });
        }
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
exports.GetSpout = GetSpout;
