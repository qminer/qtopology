import * as fs from "fs";
import * as path from "path";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as zlib from 'zlib';
import * as async from "async";

/////////////////////////////////////////////////////////////////////////////

const injection_placeholder = "##INJECT##";
const injection_placeholder_field = "##INJECT2##";

/** Class for utility methods */
class Utils {

    static toISOFormatLocal(d: number): string {
        let tzoffset = (new Date()).getTimezoneOffset() * 60000; // timezone offset in milliseconds
        let s = (new Date(d - tzoffset)).toISOString().slice(0, -1);
        return s;
    }

    static fileNameTimestampValue(ts: number, split_period: number): string {
        let d = Math.floor(ts / split_period) * split_period;
        let s = this.toISOFormatLocal(d);
        s = s.slice(0, s.indexOf("."));
        s = s.replace(/\:/ig, "_").replace(/\-/ig, "_");
        return s;
    }

    /** Utility function for getting data from object */
    static getValueFromObject(obj: any, field_path: string[]): any {
        for (let i = 0; i < field_path.length - 1; i++) {
            obj = obj[field_path[i]];
        }
        return obj[field_path[field_path.length - 1]];
    }
}

/** Single-bucket handling class */
export class BucketHandler {

    private file_name_template: string;
    private log_prefix: string;
    private ts_max: number;
    private ts_start: number;
    private split_period: number;
    private data: string[];
    private file_name_current: string;
    private curr_file_contains_data: boolean;


    /** Constructor that intializes this object */
    constructor(log_prefix: string, file_name_template: string, field_value: string, ts_start: number, split_period: number) {
        this.log_prefix = log_prefix;
        this.file_name_template = file_name_template
            .replace(injection_placeholder_field, field_value);
        this.split_period = split_period;
        this.data = [];
        this.setTsFields(ts_start);

    }

    /** Given arbitrary timestamp, calculates and sets the start
     * and the end timestamps in internal members. */
    private setTsFields(ts_start: number) {
        this.ts_start = Math.floor(ts_start / this.split_period) * this.split_period;
        this.ts_max = this.ts_start + this.split_period;
        this.file_name_current = this.file_name_template
            .replace(injection_placeholder, Utils.fileNameTimestampValue(this.ts_start, this.split_period));
        this.curr_file_contains_data = false;
        log.logger().debug(`${this.log_prefix} new file generated: ${this.file_name_current}`);
    }

    /** Perform low-level zipping */
    private zipFile(fname: string, callback: intf.SimpleCallback) {
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
                if (err) return callback(err);
                fs.unlink(filePath, callback);
            });
        } catch (e) {
            if (fs.existsSync(gzFilePath)) {
                fs.unlinkSync(gzFilePath);
            }
            callback(e);
        }
    }

    /** Writes pending data to file */
    private writeFile(fname: string, callback: intf.SimpleCallback) {
        // write if any pending data
        if (this.data.length == 0) {
            return callback();
        }
        let self = this;
        let data = self.data;
        self.data = [];
        for (let line of data) {
            fs.appendFileSync(fname, line);
        }
        this.curr_file_contains_data = true;
        callback();
    }

    /** Flushes all data and closes the object */
    private closeCurrentFile(callback: intf.SimpleCallback) {
        let fname = this.file_name_current;
        let self = this;
        self.writeFile(fname, (err) => {
            if (err) return callback(err);
            if (self.curr_file_contains_data) {
                self.zipFile(fname, callback);
            } else {
                callback();
            }
        });
    }

    /** Closes this object */
    flush(callback: intf.SimpleCallback) {
        this.writeFile(this.file_name_current, callback);
    }

    /** Closes this object */
    close(callback: intf.SimpleCallback) {
        this.closeCurrentFile(callback);
    }

    /** Handles new incoming data record */
    receive(ts: number, data: string, callback: intf.SimpleCallback) {
        let self = this;
        if (self.ts_max < ts) {
            self.closeCurrentFile((err) => {
                if (err) return callback(err);
                self.setTsFields(ts);
                self.data.push(data);
                callback();
            });
        } else {
            self.data.push(data);
            callback();
        }
    }
}

/** This bolt writes incoming messages to file. Data is split into
 * several files/buckets, based on the value of a specific field.
 * Also, data is grouped into files based on timestamp field.
 * ASSUMPTION: The data is sequential with respect to timestamp (within each bucket)
 */
export class FileAppendBoltEx implements intf.Bolt {

    private name: string;
    private log_prefix: string;
    private file_name_template: string;
    private split_period: number;
    private split_by_field: string[];
    private timestamp_field: string[];
    private buckets: Map<string, BucketHandler>;
    private propagate_errors: boolean;

    constructor() {
        this.name = null;
        this.log_prefix = null;
        this.buckets = new Map<string, BucketHandler>();
        this.split_by_field = null;
        this.timestamp_field = null;
        this.propagate_errors = true;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.log_prefix = `[FileAppendBolt ${this.name}] `;
        this.file_name_template = config.file_name_template;
        this.split_period = config.split_period || 60 * 60 * 1000;
        this.split_by_field = config.split_by_field.split(".");
        this.timestamp_field = config.timestamp_field.split(".");
        this.propagate_errors = (config.propagate_errors == undefined) ? true : config.propagate_errors;

        // prepare filename template for injection
        let ext = path.extname(this.file_name_template);
        this.file_name_template =
            this.file_name_template.slice(0, this.file_name_template.length - ext.length) +
            "_" + injection_placeholder +
            "_" + injection_placeholder_field +
            ext;

        callback();
    }

    heartbeat() {
        for (let bh of this.buckets.values()) {
            bh.flush((err) => {
                if (err) {
                    log.logger().error(this.log_prefix + "Error in flushing file-append");
                    log.logger().exception(err);
                }
            });
        }
    }

    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        async.each(
            Array.from(self.buckets.values()),
            (bh: BucketHandler, xcallback) => {
                bh.close((err) => {
                    if (err) {
                        log.logger().error(this.log_prefix + "Error in shutdown");
                        log.logger().exception(err);
                    }
                    if (err && self.propagate_errors) {
                        return xcallback(err);
                    } else {
                        return xcallback();
                    }
                });
            },
            callback
        );
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        let self = this;
        let s = "";
        s += JSON.stringify(data);
        let obj = data;
        let key: string = Utils.getValueFromObject(obj, this.split_by_field);
        let ts: any = Utils.getValueFromObject(obj, this.timestamp_field);
        ts = (new Date(ts)).getTime();

        // create new bucket if needed
        if (!this.buckets.has(key)) {
            let bh = new BucketHandler(
                this.log_prefix, this.file_name_template,
                key, ts, this.split_period
            );
            this.buckets.set(key, bh);
        }
        this.buckets.get(key).receive(ts, s + "\n", (err) => {
            if (err) {
                log.logger().error(this.log_prefix + "Error in receive");
                log.logger().exception(err);
            }
            if (err && self.propagate_errors) {
                return callback(err);
            } else {
                return callback();
            }
        });
    }
}
