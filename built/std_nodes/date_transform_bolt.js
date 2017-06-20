"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** This bolt transforms given date fields in incoming
 * messages from text or number into Date objects
 * and sends them forward. */
class DateTransformBolt {
    constructor() {
        this.onEmit = null;
        this.date_transform_fields = [];
    }
    init(name, config, context, callback) {
        this.onEmit = config.onEmit;
        this.date_transform_fields = config.date_transform_fields || [];
        this.stream_id = config.stream_id;
        this.reuse_stream_id = config.reuse_stream_id;
        callback();
    }
    heartbeat() { }
    shutdown(callback) {
        callback();
    }
    receive(data, stream_id, callback) {
        for (let date_field of this.date_transform_fields) {
            if (data[date_field]) {
                data[date_field] = new Date(data[date_field]);
            }
        }
        this.onEmit(data, (this.reuse_stream_id ? stream_id : this.stream_id), callback);
    }
}
exports.DateTransformBolt = DateTransformBolt;
//# sourceMappingURL=date_transform_bolt.js.map