import * as intf from "../topology_interfaces";
/** This bolt writes incoming messages to file. */
export declare class FileAppendBolt implements intf.Bolt {
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
    private propagate_errors;
    constructor();
    init(name: string, config: any, context: any, callback: intf.SimpleCallback): void;
    private toISOFormatLocal;
    private fileNameTimestampValue;
    private writeToFile;
    /** Zip current file if it exists  */
    private zipCurrentFile;
    /** Perform low-level zipping */
    private zipFile;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
/** This bolt writes incoming messages to file in CSV format. */
export declare class CsvFileAppendBolt implements intf.Bolt {
    private transform;
    private file_name;
    private delimiter;
    private current_data;
    constructor();
    init(_name: string, config: any, _context: any, callback: intf.SimpleCallback): void;
    private writeToFile;
    heartbeat(): void;
    shutdown(callback: intf.SimpleCallback): void;
    receive(data: any, stream_id: string, callback: intf.SimpleCallback): void;
}
