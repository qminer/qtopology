import * as intf from "../topology_interfaces";
/** Single-bucket handling class */
export declare class BucketHandler {
    private file_name_template;
    private log_prefix;
    private ts_max;
    private ts_start;
    private split_period;
    private data;
    private file_name_current;
    private curr_file_contains_data;
    /** Constructor that intializes this object */
    constructor(log_prefix: string, file_name_template: string, field_value: string, ts_start: number, split_period: number);
    /** Given arbitrary timestamp, calculates and sets the start
     * and the end timestamps in internal members. */
    private setTsFields;
    /** Perform low-level zipping */
    private zipFile;
    /** Writes pending data to file */
    private writeFile;
    /** Flushes all data and closes the object */
    private closeCurrentFile;
    /** Closes this object */
    flush(callback: intf.SimpleCallback): void;
    /** Closes this object */
    close(callback: intf.SimpleCallback): void;
    /** Handles new incoming data record */
    receive(ts: number, data: string, callback: intf.SimpleCallback): void;
}
/** This bolt writes incoming messages to file. Data is split into
 * several files/buckets, based on the value of a specific field.
 * Also, data is grouped into files based on timestamp field.
 * ASSUMPTION: The data is sequential with respect to timestamp (within each bucket)
 */
export declare class FileAppendBoltEx implements intf.Bolt {
    private name;
    private log_prefix;
    private file_name_template;
    private split_period;
    private split_by_field;
    private timestamp_field;
    private buckets;
    private propagate_errors;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
