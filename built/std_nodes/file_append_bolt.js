"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
/////////////////////////////////////////////////////////////////////////////
const injection_placeholder = "##INJECT##";
/** This bolt writes incoming messages to file. */
class FilterBolt {
    constructor() {
        this.name = null;
        this.current_data = "";
    }
    init(name, config, context, callback) {
        this.name = name;
        this.file_name_template = config.file_name_template;
        this.prepend_timestamp = config.prepend_timestamp;
        this.timestamp_in_utc = config.timestamp_in_utc;
        this.split_over_time = config.split_over_time;
        this.split_period = config.split_period;
        callback();
    }
    toISOFormatLocal(d) {
        let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        let s = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, -1);
        return s;
    }
    fileNameTimestampValue() {
        let s = this.toISOFormatLocal(new Date());
        s.replace(/\:/i, "_").replace(/\-/i, "_");
        return s;
    }
    writeToFile(callback) {
        if (this.current_data.length == 0)
            return;
        let d = Date.now();
        if (this.split_over_time && this.next_split_after < d) {
            this.file_name_current = this.file_name_template.replace(injection_placeholder, this.fileNameTimestampValue());
            this.next_split_after = d + this.split_period;
        }
        let s = this.current_data;
        this.current_data = null;
        fs.appendFile(this.file_name_current, s, callback);
    }
    heartbeat() {
        this.writeToFile(() => { });
    }
    shutdown(callback) {
        this.writeToFile(callback);
    }
    receive(data, stream_id, callback) {
        let s = "";
        if (this.prepend_timestamp) {
            s += this.toISOFormatLocal(new Date()) + " ";
        }
        this.current_data += s;
        callback();
    }
}
exports.FilterBolt = FilterBolt;
//# sourceMappingURL=file_append_bolt.js.map