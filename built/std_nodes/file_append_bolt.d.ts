import * as intf from "../topology_interfaces";
/** This bolt writes incoming messages to file. */
export declare class FileAppendBolt implements intf.Bolt {
    private name;
    private log_prefix;
    private file_name_current;
    private file_name_template;
    private current_data;
    private current_file_contains_data;
    private prepend_timestamp;
    private split_over_time;
    private split_period;
    private next_split_after;
    private compress;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    private toISOFormatLocal(d);
    private fileNameTimestampValue();
    private writeToFile(callback);
    /** Zip current file if it exists  */
    private zipCurrentFile(xcallback);
    /** Perform low-level zipping */
    private zipFile(fname, callback);
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
