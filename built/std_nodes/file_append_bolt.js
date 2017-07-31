"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
/////////////////////////////////////////////////////////////////////////////
const injection_placeholder = "##INJECT##";
/** This bolt writes incoming messages to file. */
class FileAppendBolt {
    constructor() {
        this.name = null;
        this.current_data = "";
    }
    init(name, config, context, callback) {
        this.name = name;
        this.file_name_template = config.file_name_template;
        this.prepend_timestamp = config.prepend_timestamp;
        this.split_over_time = config.split_over_time;
        this.split_period = config.split_period || 60 * 60 * 1000;
        // prepare filename template for injection
        if (this.split_over_time) {
            let ext = path.extname(this.file_name_template);
            this.next_split_after = Math.floor(Date.now() / this.split_period) * this.split_period;
            this.file_name_template =
                this.file_name_template.slice(0, this.file_name_template.length - ext.length) +
                    "_" + injection_placeholder +
                    ext;
        }
        else {
            this.file_name_current = this.file_name_template;
        }
        callback();
    }
    toISOFormatLocal(d) {
        let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        let s = (new Date(d - tzoffset)).toISOString().slice(0, -1);
        return s;
    }
    fileNameTimestampValue() {
        let d = Math.floor(Date.now() / this.split_period) * this.split_period;
        let s = this.toISOFormatLocal(d);
        s = s.slice(0, s.indexOf("."));
        s = s.replace(/\:/ig, "_").replace(/\-/ig, "_");
        return s;
    }
    writeToFile(callback) {
        if (this.current_data.length == 0)
            return callback();
        let d = Date.now();
        if (this.split_over_time && this.next_split_after < d) {
            this.file_name_current = this.file_name_template.replace(injection_placeholder, this.fileNameTimestampValue());
            this.next_split_after = d + this.split_period;
        }
        let s = this.current_data;
        this.current_data = "";
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
            s += this.toISOFormatLocal(Date.now()) + " ";
        }
        s += JSON.stringify(data);
        this.current_data += s + "\n";
        callback();
    }
}
exports.FileAppendBolt = FileAppendBolt;
//# sourceMappingURL=file_append_bolt.js.map