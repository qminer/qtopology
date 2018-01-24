"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const log = require("../util/logger");
const zlib = require("zlib");
const async = require("async");
/////////////////////////////////////////////////////////////////////////////
const injection_placeholder = "##INJECT##";
const injection_placeholder_field = "##INJECT2##";
/** This bolt writes incoming messages to file. */
class FileAppendBolt {
    constructor() {
        this.name = null;
        this.log_prefix = null;
        this.current_data = new Map();
        this.split_value = new Set();
        this.current_file_contains_data = false;
        this.split_by_field = null;
        this.propagate_errors = true;
    }
    init(name, config, context, callback) {
        this.name = name;
        this.log_prefix = `[FileAppendBolt ${this.name}] `;
        this.file_name_template = config.file_name_template;
        this.prepend_timestamp = config.prepend_timestamp;
        this.split_over_time = config.split_over_time;
        this.split_period = config.split_period || 60 * 60 * 1000;
        if (config.split_by_field) {
            this.split_by_field = config.split_by_field.split(".");
        }
        this.compress = config.compress;
        this.propagate_errors = (config.propagate_errors == undefined) ? true : config.propagate_errors;
        // prepare filename template for injection
        if (this.split_over_time) {
            let ext = path.extname(this.file_name_template);
            this.next_split_after = Math.floor(Date.now() / this.split_period) * this.split_period;
            this.file_name_template =
                this.file_name_template.slice(0, this.file_name_template.length - ext.length) +
                    "_" + injection_placeholder +
                    (this.split_by_field ? "_" + injection_placeholder_field : "") +
                    ext;
        }
        else {
            this.file_name_current = this.file_name_template;
            if (config.delete_existing) {
                if (fs.existsSync(this.file_name_current)) {
                    fs.unlinkSync(this.file_name_current);
                }
            }
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
        if (this.current_data.size == 0)
            return callback();
        let d = Date.now();
        let do_file_split = (this.split_over_time && this.next_split_after < d);
        let self = this;
        async.series([
            (xcallback) => {
                if (!do_file_split)
                    return xcallback();
                // perform compression of existing file if it exists.
                // only used when file split will occur
                // otherwise we just zip at shutdown.
                this.zipCurrentFile(xcallback);
            },
            (xcallback) => {
                if (!do_file_split)
                    return xcallback();
                // calculate new file name
                self.current_file_contains_data = false;
                self.file_name_current = self.file_name_template.replace(injection_placeholder, self.fileNameTimestampValue());
                log.logger().debug(`${self.log_prefix} new file generated: ${self.file_name_current}`);
                self.next_split_after = d + self.split_period;
                xcallback();
            },
            (xcallback) => {
                // write data to current file
                self.current_data.forEach((value, key) => {
                    let lines = value;
                    this.split_value.add(key);
                    let fname = self.file_name_current.replace(injection_placeholder_field, key);
                    for (let line of lines) {
                        fs.appendFileSync(fname, line);
                    }
                });
                self.current_data.clear();
                self.current_file_contains_data = true;
                xcallback();
            },
        ], callback);
    }
    /** Zip current file if it exists  */
    zipCurrentFile(callback) {
        let self = this;
        if (self.compress && self.current_file_contains_data) {
            let fnames = [];
            self.split_value.forEach((value, key) => {
                let fname = self.file_name_current.replace(injection_placeholder_field, key);
                fnames.push(fname);
            });
            async.eachLimit(fnames, 3, (item, xcallback) => {
                if (fs.existsSync(item)) {
                    log.logger().debug(`${self.log_prefix} compressing current file: ${item}`);
                    self.zipFile(item, xcallback);
                }
                else {
                    xcallback();
                }
            }, callback);
        }
        else {
            callback();
        }
    }
    /** Perform low-level zipping */
    zipFile(fname, callback) {
        const filePath = path.resolve(fname);
        if (!fs.existsSync(filePath)) {
            return callback(new Error("Cannot zip, filename is missing: " + filePath));
        }
        let counter = 0;
        let gzFilePath = path.resolve(fname + "_" + counter + ".gz");
        while (fs.existsSync(gzFilePath)) {
            counter++;
            gzFilePath = path.resolve(fname + "_" + counter + ".gz");
        }
        try {
            let gzOption = {
                level: zlib.Z_BEST_SPEED,
                memLevel: zlib.Z_BEST_SPEED
            };
            let gzip = zlib.createGzip(gzOption);
            const inputStream = fs.createReadStream(filePath);
            const outStream = fs.createWriteStream(gzFilePath);
            inputStream.pipe(gzip).pipe(outStream);
            outStream.on('finish', (err) => {
                if (err)
                    return callback(err);
                fs.unlink(filePath, callback);
            });
        }
        catch (e) {
            if (fs.existsSync(gzFilePath)) {
                fs.unlinkSync(gzFilePath);
            }
            callback(e);
        }
    }
    heartbeat() {
        this.writeToFile(() => { });
    }
    shutdown(callback) {
        let self = this;
        let cb = (err) => {
            if (err) {
                log.logger().error(this.log_prefix + "Error in shutdown");
                log.logger().exception(err);
            }
            if (err && self.propagate_errors) {
                return callback(err);
            }
            else {
                return callback();
            }
        };
        this.writeToFile((err) => {
            if (err)
                return cb(err);
            if (self.compress && self.current_file_contains_data) {
                self.zipCurrentFile(cb);
            }
            else {
                cb(null);
            }
        });
    }
    receive(data, stream_id, callback) {
        let s = "";
        try {
            if (this.prepend_timestamp) {
                s += this.toISOFormatLocal(Date.now()) + " ";
            }
            s += JSON.stringify(data);
            let key = "";
            if (this.split_by_field) {
                let obj = data;
                for (let i = 0; i < this.split_by_field.length - 1; i++) {
                    obj = obj[this.split_by_field[i]];
                }
                key = obj[this.split_by_field[this.split_by_field.length - 1]];
            }
            if (!this.current_data.has(key)) {
                this.current_data.set(key, []);
            }
            this.current_data.get(key).push(s + "\n");
            callback();
        }
        catch (e) {
            log.logger().error(this.log_prefix + "Error in receive");
            log.logger().exception(e);
            if (this.propagate_errors) {
                return callback(e);
            }
            else {
                return callback();
            }
        }
    }
}
exports.FileAppendBolt = FileAppendBolt;
//# sourceMappingURL=file_append_bolt.js.map