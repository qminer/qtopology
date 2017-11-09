import * as fs from "fs";
import * as path from "path";
import * as intf from "../topology_interfaces";
import * as log from "../util/logger";
import * as zlib from 'zlib';
import * as async from "async";

/////////////////////////////////////////////////////////////////////////////

const injection_placeholder = "##INJECT##";

/** This bolt writes incoming messages to file. */
export class FileAppendBolt implements intf.Bolt {

    private name: string;
    private log_prefix: string;

    private file_name_current: string;
    private file_name_template: string;

    private current_data: string[];
    private current_file_contains_data: boolean;

    private prepend_timestamp: boolean;
    private split_over_time: boolean;
    private split_period: number;
    private next_split_after: number;
    private compress: boolean;

    constructor() {
        this.name = null;
        this.log_prefix = null;
        this.current_data = [];
        this.current_file_contains_data = false;
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.log_prefix = `[FileAppendBolt ${this.name}] `;
        this.file_name_template = config.file_name_template;
        this.prepend_timestamp = config.prepend_timestamp;
        this.split_over_time = config.split_over_time;
        this.split_period = config.split_period || 60 * 60 * 1000;
        this.compress = config.compress;

        // prepare filename template for injection
        if (this.split_over_time) {
            let ext = path.extname(this.file_name_template);
            this.next_split_after = Math.floor(Date.now() / this.split_period) * this.split_period;
            this.file_name_template =
                this.file_name_template.slice(0, this.file_name_template.length - ext.length) +
                "_" + injection_placeholder +
                ext;
        } else {
            this.file_name_current = this.file_name_template;
            if (config.delete_existing) {
                if (fs.existsSync(this.file_name_current)) {
                    fs.unlinkSync(this.file_name_current);
                }
            }
        }

        callback();
    }

    private toISOFormatLocal(d: number): string {
        let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        let s = (new Date(d - tzoffset)).toISOString().slice(0, -1);
        return s;
    }

    private fileNameTimestampValue(): string {
        let d = Math.floor(Date.now() / this.split_period) * this.split_period;
        let s = this.toISOFormatLocal(d);
        s = s.slice(0, s.indexOf("."));
        s = s.replace(/\:/ig, "_").replace(/\-/ig, "_");
        return s;
    }

    private writeToFile(callback: intf.SimpleCallback) {
        if (this.current_data.length == 0) return callback();

        let d = Date.now();
        let do_file_split = (this.split_over_time && this.next_split_after < d);
        let self = this;
        async.series(
            [
                (xcallback) => {
                    if (!do_file_split) return xcallback();
                    // perform compressio of existing file if it exists
                    this.zipCurrentFile(xcallback);
                },
                (xcallback) => {
                    if (!do_file_split) return xcallback();
                    // calculate new file name
                    self.current_file_contains_data = false;
                    self.file_name_current = self.file_name_template.replace(injection_placeholder, self.fileNameTimestampValue());
                    log.logger().log(`${self.log_prefix} new file generated: ${self.file_name_current}`);
                    self.next_split_after = d + self.split_period;
                    xcallback();
                },
                (xcallback) => {
                    // write data to current file
                    let lines = self.current_data;
                    self.current_data = [];
                    for (let line of lines) {
                        fs.appendFileSync(self.file_name_current, line);
                    }
                    self.current_file_contains_data = true;
                    xcallback();
                },
            ],
            callback
        );
    }

    /** Zip current file if it exists  */
    private zipCurrentFile(xcallback: any) {
        let self = this;
        if (self.compress && self.current_file_contains_data) {
            log.logger().log(`${self.log_prefix} compressing current file: ${self.file_name_current}`);
            self.zipFile(self.file_name_current, xcallback);
        } else {
            xcallback();
        }
    }

    /** Perform low-level zipping */
    private zipFile(fname: string, callback: intf.SimpleCallback) {
        if (!fs.existsSync(fname)) {
            throw new Error(`File ${fname} doesn't exist.`);
        }
        const filePath = path.resolve(fname);
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

    heartbeat() {
        this.writeToFile(() => { });
    }

    shutdown(callback: intf.SimpleCallback) {
        let self = this;
        this.writeToFile((err) => {
            if (err) return callback(err);
            if (self.current_file_contains_data) {
                self.zipCurrentFile(callback);
            } else {
                callback();
            }
        });
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        let s = "";
        if (this.prepend_timestamp) {
            s += this.toISOFormatLocal(Date.now()) + " ";
        }
        s += JSON.stringify(data);
        this.current_data.push(s + "\n");
        callback();
    }
}
