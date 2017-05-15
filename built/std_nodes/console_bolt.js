"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const log = require("../util/logger");
/** This bolt just writes all incoming data to console. */
class ConsoleBolt {
    constructor() {
        this.name = null;
        this.prefix = "";
        this.onEmit = null;
    }
    init(name, config, context, callback) {
        this.name = name;
        this.prefix = `[InprocBolt ${this.name}]`;
        this.onEmit = config.onEmit;
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        log.logger().log(`${this.prefix} [stream_id=${stream_id}] ${JSON.stringify(data)}`);
        this.onEmit(data, stream_id, callback);
    }
}
exports.ConsoleBolt = ConsoleBolt;
//# sourceMappingURL=console_bolt.js.map