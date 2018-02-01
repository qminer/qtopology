"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require("../util/logger");
/** This bolt counts incoming data and outputs statistics
 * to console and emits it as message to listeners. */
class CounterBolt {
    constructor() {
        this.name = null;
        this.onEmit = null;
        this.prefix = "";
        this.counter = 0;
        this.last_output = Date.now();
    }
    init(name, config, context, callback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.prefix = `[${this.name}]`;
        if (config.prefix) {
            this.prefix += ` ${config.prefix}`;
        }
        this.timeout = config.timeout;
        callback();
    }
    heartbeat() {
        let d = Date.now();
        if (d >= this.last_output + this.timeout) {
            let sec = Math.round(d - this.last_output) / 1000;
            log.logger().log(`${this.prefix} processed ${this.counter} in ${sec} sec`);
            let msg = {
                ts: new Date(),
                counter: this.counter,
                period: sec
            };
            this.counter = 0;
            this.last_output = d;
            this.onEmit(msg, null, () => { });
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