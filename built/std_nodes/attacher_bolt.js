"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This bolt attaches fixed fields to incoming messages
 * and sends them forward. */
class AttacherBolt {
    constructor() {
        this.name = null;
        this.onEmit = null;
        this.extra_fields = null;
    }
    init(name, config, context, callback) {
        this.name = name;
        this.onEmit = config.onEmit;
        this.extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        for (let f in this.extra_fields) {
            if (this.extra_fields.hasOwnProperty(f)) {
                data[f] = this.extra_fields[f];
            }
        }
        this.onEmit(data, stream_id, callback);
    }
}
exports.AttacherBolt = AttacherBolt;
//# sourceMappingURL=attacher_bolt.js.map