import * as intf from "../topology_interfaces";
/** This bolt writes incoming messages to file. Data is split into
 * several files, based on the value of a specific field.
 * Also, data is grouped into files based on timestamp field.
 */
export declare class FileAppendBoltEx implements intf.Bolt {
    private name;
    private log_prefix;
    private file_name_current;
    private file_name_template;
    private current_data;
    private current_file_contains_data;
    private split_value;
    private prepend_timestamp;
    private split_over_time;
    private split_period;
    private split_by_field;
    private next_split_after;
    private compress;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    private toISOFormatLocal(d);
    private fileNameTimestampValue();
    private writeToFile(callback);
    /** Zip current file if it exists  */
    private zipCurrentFile(callback);
    /** Perform low-level zipping */
    private zipFile(fname, callback);
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
