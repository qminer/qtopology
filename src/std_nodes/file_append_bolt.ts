import * as fs from "fs";
import * as path from "path";
import * as intf from "../topology_interfaces";
import * as pm from "../util/pattern_matcher";

/////////////////////////////////////////////////////////////////////////////

const injection_placeholder = "##INJECT##";

/** This bolt writes incoming messages to file. */
export class FilterBolt implements intf.Bolt {

    private name: string;

    private file_name_current: string;
    private file_name_template: string;

    private current_data: string;

    private prepend_timestamp: boolean;
    private timestamp_in_utc: boolean;
    private split_over_time: boolean;
    private split_period: number;
    private next_split_after: number;


    constructor() {
        this.name = null;
        this.current_data = "";
    }

    init(name: string, config: any, context: any, callback: intf.SimpleCallback) {
        this.name = name;
        this.file_name_template = config.file_name_template;
        this.prepend_timestamp = config.prepend_timestamp;
        this.timestamp_in_utc = config.timestamp_in_utc;
        this.split_over_time = config.split_over_time;
        this.split_period = config.split_period;

        // prepare filename template for injection
        if (this.split_over_time) {
            let ext = path.extname(this.file_name_template);
            this.file_name_template =
                this.file_name_template.slice(0, this.file_name_template.length - ext.length) +
                injection_placeholder +
                ext;
        } else {
            this.file_name_current = this.file_name_template;
        }

        callback();
    }

    private toISOFormatLocal(d: Date): string {
        let tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
        let s = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, -1);
        return s;
    }

    private fileNameTimestampValue(): string {
        let s = this.toISOFormatLocal(new Date());
        s.replace(/\:/i, "_").replace(/\-/i, "_");
        return s;
    }

    private writeToFile(callback: intf.SimpleCallback) {
        if (this.current_data.length == 0) return;

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

    shutdown(callback: intf.SimpleCallback) {
        this.writeToFile(callback);
    }

    receive(data: any, stream_id: string, callback: intf.SimpleCallback) {
        let s = "";
        if (this.prepend_timestamp) {
            s += this.toISOFormatLocal(new Date()) + " ";
        }
        this.current_data += s;
        callback();
    }
}
