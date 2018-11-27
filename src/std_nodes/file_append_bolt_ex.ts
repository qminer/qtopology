import * as fs from "fs";
import * as path from "path";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as zlib from "zlib";
import * as async from "async";

/////////////////////////////////////////////////////////////////////////////

const injection_placeholder = "##INJECT##";
const injection_placeholder_field = "##INJECT2##";

/** Class for utility methods */
class Utils {

    public static toISOFormatLocal(d: number): string {
        const tzoffset = (new Date()).getTimezoneOffset() * 60000; // timezone offset in milliseconds
        const s = (new Date(d - tzoffset)).toISOString().slice(0, -1);
        return s;
    }

    public static fileNameTimestampValue(ts: number, split_period: number): string {
        const d = Math.floor(ts / split_period) * split_period;
        let s = this.toISOFormatLocal(d);
        s = s.slice(0, s.indexOf("."));
        s = s.replace(/\:/ig, "_").replace(/\-/ig, "_");
        return s;
    }

    /** Utility function for getting data from object */
    public static getValueFromObject(obj: any, field_path: string[]): any {
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
    constructor(
        log_prefix: string, file_name_template: string, field_value: string,
        ts_start: number, split_period: number
    ) {
        this.log_prefix = log_prefix;
        this.file_name_template = file_name_template
            .replace(injection_placeholder_field, field_value);
        this.split_period = split_period;
        this.data = [];
        this.setTsFields(ts_start);
    }

    /** Closes this object */
    public flush(callback: intf.SimpleCallback) {
        this.writeFile(this.file_name_current, callback);
    }

    /** Closes this object */
    public close(callback: intf.SimpleCallback) {
        this.closeCurrentFile(callback);
    }

    /** Handles new incoming data record */
    public receive(ts: number, data: string, callback: intf.SimpleCallback) {
        if (this.ts_max < ts) {
            this.closeCurrentFile(err => {
                if (err) {
                    return callback(err);
                }
                this.setTsFields(ts);
                this.data.push(data);
                callback();
            });
        } else {
            this.data.push(data);
            callback();
        }
    }

    /** Given arbitrary timestamp, calculates and sets the start
     * and the end timestamps in internal members.
     */
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
            const gzOption = {
                level: zlib.Z_BEST_SPEED,
                memLevel: zlib.Z_BEST_SPEED
            };
            const gzip = zlib.createGzip(gzOption);
            const inputStream = fs.createReadStream(filePath);
            const outStream = fs.createWriteStream(gzFilePath);
            inputStream.pipe(gzip).pipe(outStream);
            outStream.on("finish", err => {
                if (err) {
                    return callback(err);
                }
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
        const data = this.data;
        this.data = [];
        for (const line of data) {
            fs.appendFileSync(fname, line);
        }
        this.curr_file_contains_data = true;
        callback();
    }

    /** Flushes all data and closes the object */
    private closeCurrentFile(callback: intf.SimpleCallback) {
        const fname = this.file_name_current;
        this.writeFile(fname, err => {
            if (err) {
                return callback(err);
            }
            if (this.curr_file_contains_data) {
                this.zipFile(fname, callback);
            } else {
                callback();
            }
        });
    }
}

/** This bolt writes incoming messages to file. Data is split into
 * several files/buckets, based on the value of a specific field.
 * Also, data is grouped into files based on timestamp field.
 * ASSUMPTION: The data is sequential with respect to timestamp (within each bucket)
 */
export class FileAppendBoltEx implements intf.IBolt {

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

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.log_prefix = `[FileAppendBolt ${this.name}] `;
        this.file_name_template = config.file_name_template;
        this.split_period = config.split_period || 60 * 60 * 1000;
        this.split_by_field = config.split_by_field.split(".");
        this.timestamp_field = config.timestamp_field.split(".");
        this.propagate_errors = (config.propagate_errors == undefined) ? true : config.propagate_errors;

        // prepare filename template for injection
        const ext = path.extname(this.file_name_template);
        this.file_name_template =
            this.file_name_template.slice(0, this.file_name_template.length - ext.length) +
            "_" + injection_placeholder +
            "_" + injection_placeholder_field +
            ext;

        callback();
    }

    public heartbeat() {
        for (const bh of this.buckets.values()) {
            bh.flush(err => {
                if (err) {
                    log.logger().error(this.log_prefix + "Error in flushing file-append");
                    log.logger().exception(err);
                }
            });
        }
    }

    public shutdown(callback: intf.SimpleCallback) {
        async.each(
            Array.from(this.buckets.values()),
            (bh: BucketHandler, xcallback) => {
                bh.close(err => {
                    if (err) {
                        log.logger().error(this.log_prefix + "Error in shutdown");
                        log.logger().exception(err);
                    }
                    if (err && this.propagate_errors) {
                        return xcallback(err);
                    } else {
                        return xcallback();
                    }
                });
            },
            callback
        );
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        let s = "";
        s += JSON.stringify(data);
        const obj = data;
        const key: string = Utils.getValueFromObject(obj, this.split_by_field);
        let ts: any = Utils.getValueFromObject(obj, this.timestamp_field);
        ts = (new Date(ts)).getTime();

        // create new bucket if needed
        if (!this.buckets.has(key)) {
            const bh = new BucketHandler(
                this.log_prefix, this.file_name_template,
                key, ts, this.split_period
            );
            this.buckets.set(key, bh);
        }
        this.buckets.get(key).receive(ts, s + "\n", err => {
            if (err) {
                log.logger().error(this.log_prefix + "Error in receive");
                log.logger().exception(err);
            }
            if (err && this.propagate_errors) {
                return callback(err);
            } else {
                return callback();
            }
        });
    }
}
