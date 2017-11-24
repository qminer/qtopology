"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const oo = require("../util/object_override");
/** This bolt attaches fixed fields to incoming messages
 * and sends them forward. */
class AttacherBolt {
    constructor() {
        this.onEmit = null;
        this.extra_fields = null;
    }
    init(name, config, context, callback) {
        this.onEmit = config.onEmit;
        this.extra_fields = JSON.parse(JSON.stringify(config.extra_fields || {}));
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        oo.overrideObject(data, this.extra_fields, false);
        this.onEmit(data, stream_id, callback);
    }
}
exports.AttacherBolt = AttacherBolt;
//# sourceMappingURL=attacher_bolt.js.map