"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require("../util/logger");
/** This bolt just writes all incoming data to console. */
class CounterBolt {
    constructor() {
        this.name = null;
        this.prefix = "";
        this.counter = 0;
        this.last_output = Date.now();
    }
    init(name, config, context, callback) {
        this.name = name;
        this.prefix = `[${this.name}]`;
        this.timeout = config.timeout;
        callback();
    }
    heartbeat() {
        let d = Date.now();
        if (d >= this.last_output + this.timeout) {
            let sec = Math.round(d - this.last_output) / 1000;
            log.logger().log(`${this.prefix} processed=${this.counter} in ${sec} sec`);
            this.counter = 0;
            this.last_output = d;
        }
    }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        this.counter++;
        callback();
    }
}
exports.CounterBolt = CounterBolt;
//# sourceMappingURL=counter_bolt.js.map